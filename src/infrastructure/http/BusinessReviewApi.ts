import type {
  PageResult,
  RepositoryRequestOptions,
  ReviewReport,
  ReviewTaskPoolApi,
  TaskPoolQuery,
} from "../../features/documents/application";
import {
  createDocumentId,
  createIsoDateTime,
  createReviewProgress,
  createReviewTaskId,
  createUserId,
  type DocumentSummary,
  type IsoDateTime,
  type ReviewTaskId,
} from "../../features/documents/domain";
import type {
  CreatedBusinessReviewTask,
  UploadedBusinessDocument,
} from "../../features/documents/infrastructure/mockProjectWorkflowApi";
import { HttpClient } from "./HttpClient";

type ReviewStatus = "CREATED" | "RUNNING" | "SUCCEEDED" | "FAILED";

interface ReviewTaskDto {
  readonly taskId: string;
  readonly fileId: string;
  readonly fileName: string;
  readonly status: ReviewStatus;
  readonly progress: number;
  readonly currentStage?: string | null;
  readonly error?: { readonly message: string; readonly retryable: boolean } | null;
  readonly createdAt: string;
  readonly startedAt?: string | null;
  readonly completedAt?: string | null;
  readonly updatedAt: string;
}

interface ReviewResultDto {
  readonly taskId: string;
  readonly fileId: string;
  readonly fileName: string;
  readonly summary: {
    readonly conclusion: string;
    readonly totalCount: number;
    readonly highCount: number;
    readonly mediumCount: number;
    readonly lowCount: number;
  };
  readonly findings: readonly {
    readonly findingId: string;
    readonly category: string;
    readonly severity: "HIGH" | "MEDIUM" | "LOW";
    readonly location: string;
    readonly title: string;
    readonly evidence: string;
    readonly description: string;
    readonly recommendation: string;
  }[];
  readonly generatedAt: string;
}

interface PageDto<T> {
  readonly list: readonly T[];
  readonly total: number;
}

function normalizeDateTime(value: string | null | undefined): IsoDateTime {
  const normalized = value?.includes("T")
    ? value
    : `${value ?? new Date().toISOString().slice(0, 19).replace("T", " ")}`.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}+08:00`;
  return createIsoDateTime(withZone);
}

function reviewTaskToDocument(task: ReviewTaskDto): DocumentSummary {
  const reviewTaskId = createReviewTaskId(task.taskId);
  const common = {
    id: createDocumentId(`business_${task.taskId}`),
    fileId: task.fileId,
    name: task.fileName,
    type: "policy" as const,
    level: "company" as const,
    category: "administration" as const,
    operator: {
      id: createUserId("business_review_service"),
      displayName: "制度审校服务",
    },
  };
  if (task.status === "SUCCEEDED") {
    return {
      ...common,
      state: {
        kind: "reviewed",
        reviewTaskId,
        reviewedAt: normalizeDateTime(task.completedAt ?? task.updatedAt),
      },
    };
  }
  return {
    ...common,
    state: {
      kind: "reviewing",
      reviewTaskId,
      startedAt: normalizeDateTime(task.startedAt ?? task.createdAt),
      progress: createReviewProgress(Math.min(100, Math.max(0, task.progress))),
      reviewStatus: task.status,
      currentStage: task.currentStage ?? undefined,
      errorMessage: task.error?.message,
      retryable: task.error?.retryable,
    },
  };
}

function readOnlyError(): never {
  throw new Error("第一阶段制度审校报告仅支持查看");
}

export class BusinessReviewApi implements ReviewTaskPoolApi {
  constructor(private readonly client: HttpClient) {}

  async uploadPolicy(
    file: File,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<UploadedBusinessDocument> {
    const body = new FormData();
    body.append("file", file);
    body.append("documentType", "POLICY");
    return this.client.request<UploadedBusinessDocument>("/business/documents", {
      method: "POST",
      body,
      idempotencyKey,
      signal,
    });
  }

  async createTask(
    fileId: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<CreatedBusinessReviewTask> {
    const task = await this.client.request<CreatedBusinessReviewTask>("/business/review/tasks", {
      method: "POST",
      body: { fileId },
      idempotencyKey,
      signal,
    });
    return {
      ...task,
      ...(task.createdAt ? { createdAt: normalizeDateTime(task.createdAt) } : {}),
    };
  }

  async list(
    query: TaskPoolQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<DocumentSummary>> {
    const data = await this.client.request<PageDto<ReviewTaskDto>>("/business/review/tasks", {
      query: { page: query.page, size: query.pageSize },
      signal: options?.signal,
    });
    return {
      items: data.list.map(reviewTaskToDocument),
      page: query.page,
      pageSize: query.pageSize,
      total: data.total,
      pageCount: data.total === 0 ? 0 : Math.ceil(data.total / query.pageSize),
    };
  }

  private getTask(taskId: ReviewTaskId, signal?: AbortSignal): Promise<ReviewTaskDto> {
    return this.client.request<ReviewTaskDto>(`/business/review/tasks/${encodeURIComponent(taskId)}`, {
      signal,
    });
  }

  async getProgress(taskId: ReviewTaskId, options?: RepositoryRequestOptions) {
    return (await this.getTask(taskId, options?.signal)).progress;
  }

  async getReport(
    taskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<ReviewReport | null> {
    const task = await this.getTask(taskId, options?.signal);
    if (task.status !== "SUCCEEDED") return null;
    const result = await this.client.request<ReviewResultDto>(
      `/business/review/tasks/${encodeURIComponent(taskId)}/result`,
      { signal: options?.signal },
    );
    return {
      taskId: createReviewTaskId(result.taskId),
      documentName: result.fileName,
      summary: result.summary.conclusion,
      risks: result.findings.map((finding) => ({
        id: finding.findingId,
        category: finding.category === "CONSISTENCY"
          ? "consistency"
          : finding.category === "CONFLICT" ? "conflict" : "semantic",
        level: finding.severity.toLowerCase() as "high" | "medium" | "low",
        title: finding.title,
        summary: `${finding.location ? `${finding.location}：` : ""}${finding.description}`,
        evidence: finding.evidence,
        suggestion: finding.recommendation,
        state: "open",
      })),
    };
  }

  createTerminationReport(): Promise<ReviewReport> { return Promise.reject(readOnlyError()); }
  ignoreAllRisks(): Promise<ReviewReport> { return Promise.reject(readOnlyError()); }
  resolveRisk(): Promise<ReviewReport> { return Promise.reject(readOnlyError()); }
  ignoreRisk(): Promise<ReviewReport> { return Promise.reject(readOnlyError()); }
  publish(): Promise<DocumentSummary> { return Promise.reject(readOnlyError()); }
  softDelete(): Promise<DocumentSummary> { return Promise.reject(readOnlyError()); }
}
