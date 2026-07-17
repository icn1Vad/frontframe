import type {
  ContractMutationOptions,
  ContractRequestOptions,
  ContractReviewApi,
  CreateContractReviewTaskCommand,
  UploadedContractDocument,
} from "../../features/contracts/application";
import {
  contractReviewModuleDefinitions,
  isContractEditorSession,
  type ContractEditorSession,
  type ContractReviewModuleId,
  type ContractReviewTask,
  type ContractRisk,
  type ContractRiskState,
} from "../../features/contracts/domain";
import { HttpClient } from "./HttpClient";

type BusinessContractStatus = "CREATED" | "RUNNING" | "SUCCEEDED" | "FAILED";

interface FileReferenceDto {
  readonly fileId: string;
  readonly fileName: string;
}

interface ContractTaskErrorDto {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

interface ContractTaskDto {
  readonly taskId: string;
  readonly contract: FileReferenceDto;
  readonly policies: readonly FileReferenceDto[];
  readonly status: BusinessContractStatus;
  readonly progress: number;
  readonly currentStage?: string | null;
  readonly error?: ContractTaskErrorDto | null;
  readonly createdAt: string;
  readonly startedAt?: string | null;
  readonly completedAt?: string | null;
  readonly updatedAt: string;
}

interface ContractResultDto {
  readonly taskId: string;
  readonly contract: FileReferenceDto;
  readonly policies: readonly FileReferenceDto[];
  readonly summary: {
    readonly conclusion: string;
    readonly totalCount: number;
    readonly highCount: number;
    readonly mediumCount: number;
    readonly lowCount: number;
    readonly overallRisk: "HIGH" | "MEDIUM" | "LOW";
  };
  readonly findings: readonly {
    readonly findingId: string;
    readonly category: string;
    readonly severity: "HIGH" | "MEDIUM" | "LOW";
    readonly title: string;
    readonly contractLocation: string;
    readonly contractExcerpt: string;
    readonly policyReference: FileReferenceDto & {
      readonly location: string;
      readonly excerpt: string;
    };
    readonly issue: string;
    readonly suggestion: string;
  }[];
  readonly generatedAt: string;
}

interface PageDto<T> {
  readonly list: readonly T[];
  readonly total: number;
}

interface LocalTaskState {
  readonly riskStates?: Readonly<Record<string, {
    readonly state: ContractRiskState;
    readonly reason?: string;
    readonly handledAt: string;
  }>>;
  readonly stored?: boolean;
}

const localStateKey = "proofspace.business-contract-review.local-state.v1";

function normalizeDate(value: string): string {
  if (value.includes("T")) return value;
  return `${value.replace(" ", "T")}+08:00`;
}

function moduleForCategory(category: string): ContractReviewModuleId {
  const normalized = category.toUpperCase();
  if (normalized.includes("PAYMENT") || normalized.includes("PERFORMANCE")) return "performance-payment";
  if (normalized.includes("DATA") || normalized.includes("SECURITY")) return "data-security";
  if (normalized.includes("INTELLECT") || normalized.includes("COPYRIGHT")) return "intellectual-property";
  if (normalized.includes("TERMIN") || normalized.includes("EXIT")) return "termination";
  if (normalized.includes("AUTH") || normalized.includes("COMPLIANCE")) return "compliance";
  return "transaction";
}

function readLocalState(): Record<string, LocalTaskState> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(localStateKey) ?? "{}") as Record<string, LocalTaskState>;
  } catch {
    window.localStorage.removeItem(localStateKey);
    return {};
  }
}

function writeLocalState(value: Record<string, LocalTaskState>) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(localStateKey, JSON.stringify(value));
  }
}

function taskStatus(status: BusinessContractStatus, stored: boolean | undefined) {
  if (stored && status === "SUCCEEDED") return "stored" as const;
  if (status === "SUCCEEDED") return "reported" as const;
  if (status === "FAILED") return "failed" as const;
  if (status === "RUNNING") return "reviewing" as const;
  return "queued" as const;
}

function mapFinding(finding: ContractResultDto["findings"][number]): ContractRisk {
  return {
    id: finding.findingId,
    clauseId: finding.findingId,
    moduleId: moduleForCategory(finding.category),
    level: finding.severity.toLowerCase() as ContractRisk["level"],
    title: finding.title,
    summary: `${finding.issue} 制度依据：${finding.policyReference.fileName} ${finding.policyReference.location}，${finding.policyReference.excerpt}`,
    suggestion: finding.suggestion,
    originalText: finding.contractExcerpt,
    state: "open",
  };
}

function applyLocalState(task: ContractReviewTask): ContractReviewTask {
  const state = readLocalState()[task.id];
  if (!state) return task;
  return {
    ...task,
    status: state.stored && task.status === "reported" ? "stored" : task.status,
    risks: task.risks.map((risk) => {
      const localRisk = state.riskStates?.[risk.id];
      if (!localRisk) return risk;
      return {
        ...risk,
        state: localRisk.state,
        ...(localRisk.state === "open" ? {} : {
          resolution: {
            operator: "当前用户（仅本浏览器）",
            handledAt: localRisk.handledAt,
            reason: localRisk.reason,
          },
        }),
      };
    }),
  };
}

function mapTask(dto: ContractTaskDto, result?: ContractResultDto): ContractReviewTask {
  const risks = result?.findings.map(mapFinding) ?? [];
  const modules = risks.length > 0
    ? [...new Set(risks.map((risk) => risk.moduleId))]
    : contractReviewModuleDefinitions.map((module) => module.id);
  const clauses = result?.findings.map((finding, index) => ({
    id: finding.findingId,
    number: finding.contractLocation || `风险位置 ${index + 1}`,
    title: finding.title,
    text: finding.contractExcerpt,
  })) ?? [];
  const local = readLocalState()[dto.taskId];
  return applyLocalState({
    id: dto.taskId,
    version: Date.parse(normalizeDate(dto.updatedAt)) || 1,
    name: dto.contract.fileName,
    size: 0,
    stance: "neutral",
    modules,
    status: taskStatus(dto.status, local?.stored),
    progress: Math.min(100, Math.max(0, dto.progress)),
    createdAt: normalizeDate(dto.createdAt),
    clauses,
    risks,
    contractFileId: dto.contract.fileId,
    policies: dto.policies,
    currentStage: dto.currentStage ?? undefined,
    error: dto.error ?? undefined,
  });
}

export class BusinessContractReviewApi implements ContractReviewApi {
  constructor(private readonly client: HttpClient) {}

  async uploadDocument(
    file: File,
    documentType: "CONTRACT" | "POLICY",
    options: ContractMutationOptions,
  ): Promise<UploadedContractDocument> {
    const body = new FormData();
    body.append("file", file);
    body.append("documentType", documentType);
    return this.client.request<UploadedContractDocument>("/business/documents", {
      method: "POST",
      body,
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
  }

  async listTasks(options?: ContractRequestOptions): Promise<readonly ContractReviewTask[]> {
    const data = await this.client.request<PageDto<ContractTaskDto>>(
      "/business/contract-reviews/tasks",
      { query: { page: 1, size: 100 }, signal: options?.signal },
    );
    return data.list.map((task) => mapTask(task));
  }

  async getTask(taskId: string, options?: ContractRequestOptions): Promise<ContractReviewTask | undefined> {
    const dto = await this.client.request<ContractTaskDto>(
      `/business/contract-reviews/tasks/${encodeURIComponent(taskId)}`,
      { signal: options?.signal },
    );
    const result = dto.status === "SUCCEEDED"
      ? await this.client.request<ContractResultDto>(
        `/business/contract-reviews/tasks/${encodeURIComponent(taskId)}/result`,
        { signal: options?.signal },
      )
      : undefined;
    return mapTask(dto, result);
  }

  async getEditorSession(taskId: string, options?: ContractRequestOptions): Promise<ContractEditorSession> {
    if (typeof window === "undefined") return { provider: "mock", reason: "在线编辑器仅在浏览器中初始化" };
    try {
      const response = await fetch(
        `/api/contract-review/tasks/${encodeURIComponent(taskId)}/editor-session`,
        { headers: { Accept: "application/json" }, signal: options?.signal },
      );
      if (!response.ok) return { provider: "mock", reason: `编辑器会话接口返回 ${response.status}` };
      const session: unknown = await response.json();
      return isContractEditorSession(session)
        ? session
        : { provider: "mock", reason: "编辑器会话配置无效" };
    } catch {
      return { provider: "mock", reason: "编辑器会话接口暂不可用" };
    }
  }

  async createTask(input: CreateContractReviewTaskCommand, options: ContractMutationOptions) {
    const dto = await this.client.request<ContractTaskDto>("/business/contract-reviews/tasks", {
      method: "POST",
      body: { contractFileId: input.contractFileId, policyFileIds: input.policyFileIds },
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
    });
    return mapTask(dto);
  }

  async startReview(taskId: string, options: ContractMutationOptions) {
    return (await this.getTask(taskId, options))!;
  }

  async generateReport(taskId: string, options: ContractMutationOptions) {
    return (await this.getTask(taskId, options))!;
  }

  async updateRisk(
    taskId: string,
    riskId: string,
    command: { readonly state: ContractRiskState; readonly reason?: string },
    options: ContractMutationOptions,
  ): Promise<ContractReviewTask> {
    options.signal?.throwIfAborted();
    if (command.state === "ignored" && !command.reason?.trim()) throw new Error("忽略风险时必须填写理由");
    const states = readLocalState();
    const current = states[taskId] ?? {};
    states[taskId] = {
      ...current,
      riskStates: {
        ...current.riskStates,
        [riskId]: {
          state: command.state,
          reason: command.reason?.trim(),
          handledAt: new Date().toISOString(),
        },
      },
    };
    writeLocalState(states);
    return (await this.getTask(taskId, options))!;
  }

  async storeTask(taskId: string, options: ContractMutationOptions): Promise<ContractReviewTask> {
    options.signal?.throwIfAborted();
    const states = readLocalState();
    states[taskId] = { ...states[taskId], stored: true };
    writeLocalState(states);
    return (await this.getTask(taskId, options))!;
  }
}
