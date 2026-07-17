import type {
  ClassificationCandidateRecord,
  ClassificationCandidateQuery,
  ClassificationCandidateStats,
  ClassificationTaskPoolApi,
  ClassificationWorkflowApi,
  ConfirmCandidateInput,
  ConfirmedCandidateResult,
  DocumentPreview,
  KnowledgeApi,
  MutationOptions,
  ReviewReport,
  ReviewRisk,
  ReviewTaskPoolApi,
  TaskPoolQuery,
  VersionedCandidateInput,
  BatchMutationResult,
} from "../application";
import type { PageResult, RepositoryRequestOptions } from "../application";
import {
  createClassificationCandidateId,
  createDocumentId,
  createIsoDateTime,
  createReviewProgress,
  createReviewTaskId,
  createUserId,
  getDocumentContractTaskId,
  getDocumentReviewTaskId,
  type DocumentId,
  type DocumentSummary,
  type ReviewTaskId,
} from "../domain";
import { MockDocumentRepository } from "./mockDocumentRepository";

const operator = {
  id: createUserId("user_zhang_san"),
  displayName: "张三",
} as const;

const previewContent =
  "第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议；紧急事项应在 3 个工作日内补充备案。";

const reviewReportStorageKey = "proofspace.review-reports.v1";

const reviewRiskSeeds: readonly Omit<
  ReviewRisk,
  "id" | "state" | "source" | "resolution"
>[] = [
  {
    category: "semantic",
    level: "high",
    title: "审批责任边界不清",
    summary: "采购管理部与董事会的审批职责没有明确区分。",
    evidence: "采购金额超过 500 万元时，由采购管理部提交董事会审议。",
    suggestion: "明确采购管理部负责材料审查，董事会负责最终决策。",
  },
  {
    category: "conflict",
    level: "high",
    title: "紧急事项期限存在冲突",
    summary: "紧急事项备案期限与现行制度中的五个工作日要求不一致。",
    evidence: "紧急事项应在 3 个工作日内补充备案。",
    suggestion: "核对上位制度并统一补充备案期限。",
  },
  {
    category: "consistency",
    level: "medium",
    title: "金额单位表达不统一",
    summary: "正文使用万元，附件使用元，存在理解偏差风险。",
    evidence: "采购金额超过 500 万元时。",
    suggestion: "统一金额单位，并在首次出现时注明币种。",
  },
  {
    category: "semantic",
    level: "medium",
    title: "审议结果缺少记录要求",
    summary: "条款没有规定审议结论、异议和附件的留档方式。",
    evidence: "由采购管理部提交董事会审议。",
    suggestion: "补充会议纪要、表决结果和附件归档要求。",
  },
  {
    category: "conflict",
    level: "medium",
    title: "适用范围与附件不一致",
    summary: "正文适用于全部采购事项，附件仅覆盖招标采购。",
    evidence: "本办法适用于公司采购管理活动。",
    suggestion: "统一正文与附件的适用范围。",
  },
  {
    category: "consistency",
    level: "low",
    title: "术语名称存在差异",
    summary: "同一审批组织在不同章节使用了两个名称。",
    evidence: "董事会、公司董事会。",
    suggestion: "统一组织名称并在术语表中定义。",
  },
];

function createReviewReport(
  reviewTaskId: ReviewTaskId,
  documentName: string,
): ReviewReport {
  return {
    taskId: reviewTaskId,
    documentName,
    summary: "本次审查重点关注审批职责、条款冲突和引用标准一致性。",
    risks: reviewRiskSeeds.map((risk, index) => ({
      ...risk,
      id: `${reviewTaskId}-risk-${index + 1}`,
      state: "open",
      source: "STUB",
    })),
  };
}

function normalizeMockReport(report: ReviewReport): ReviewReport {
  return {
    ...report,
    risks: report.risks.map((risk) => ({
      ...risk,
      source: risk.source ?? "STUB",
    })),
  };
}

function requireIgnoreReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) throw new Error("忽略风险时必须填写理由");
  return normalized;
}

function handledRisk(
  risk: ReviewRisk,
  state: "resolved" | "ignored",
  reason?: string,
): ReviewRisk {
  return {
    ...risk,
    state,
    resolution: {
      operator: operator.displayName,
      handledAt: now(),
      ...(reason ? { reason } : {}),
    },
  };
}

function updateReviewRisk(
  report: ReviewReport,
  riskId: string,
  updater: (risk: ReviewRisk) => ReviewRisk,
): ReviewReport {
  const target = report.risks.find((risk) => risk.id === riskId);
  if (!target) throw new Error("风险项不存在");
  return {
    ...report,
    risks: report.risks.map((risk) =>
      risk.id === riskId ? updater(risk) : risk,
    ),
  };
}

const initialCandidates: readonly ClassificationCandidateRecord[] = [
  {
    id: createClassificationCandidateId("candidate_purchase_policy"),
    name: "采购管理办法（修订稿）.docx",
    type: "policy",
    level: "company",
    category: "procurement",
    state: "awaiting-confirmation",
    version: 1,
  },
  {
    id: createClassificationCandidateId("candidate_project_contract"),
    name: "星河项目服务合同.pdf",
    type: "contract",
    level: "department",
    category: "contract",
    state: "awaiting-confirmation",
    version: 1,
  },
  {
    id: createClassificationCandidateId("candidate_compliance_report"),
    name: "年度合规报告.pdf",
    type: "report",
    level: "company",
    category: "supply-chain",
    state: "classifying",
    version: 1,
  },
  {
    id: createClassificationCandidateId("candidate_regulations"),
    name: "法律法规汇编.pdf",
    type: "other",
    level: "external-standard",
    category: "external-standard",
    state: "awaiting-confirmation",
    version: 1,
  },
];

function throwIfAborted(options?: RepositoryRequestOptions) {
  options?.signal?.throwIfAborted();
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function now() {
  return createIsoDateTime(new Date().toISOString());
}

function previousKind(state: DocumentSummary["state"]) {
  return state.kind === "deleted" ? state.previousKind : state.kind;
}

function taskQuery(query: TaskPoolQuery, collection: "classification" | "review" | "knowledge") {
  return { ...query, collection } as const;
}

export class MockClassificationWorkflowApi
  implements ClassificationWorkflowApi
{
  private candidates = [...initialCandidates];
  private readonly confirmedRequests = new Map<
    string,
    BatchMutationResult<ConfirmedCandidateResult>
  >();
  private readonly deletedRequests = new Map<
    string,
    BatchMutationResult<ClassificationCandidateRecord>
  >();

  constructor(private readonly documents: MockDocumentRepository) {}

  /** Simulates an internal AI callback; it is intentionally not part of the browser API. */
  applyAiClassification(
    candidateId: ClassificationCandidateRecord["id"],
    result: Pick<
      ClassificationCandidateRecord,
      "type" | "level" | "category"
    >,
    expectedVersion: number,
  ): boolean {
    const index = this.candidates.findIndex((item) => item.id === candidateId);
    const candidate = this.candidates[index];
    if (!candidate || candidate.version !== expectedVersion) return false;
    this.candidates[index] = {
      ...candidate,
      ...result,
      state: "awaiting-confirmation",
      version: candidate.version + 1,
    };
    return true;
  }

  async getStats(
    options?: RepositoryRequestOptions,
  ): Promise<ClassificationCandidateStats> {
    throwIfAborted(options);
    return {
      total: this.candidates.length,
      classifying: this.candidates.filter((item) => item.state === "classifying").length,
      awaitingConfirmation: this.candidates.filter(
        (item) => item.state === "awaiting-confirmation",
      ).length,
    };
  }

  async listCandidates(
    query: ClassificationCandidateQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<ClassificationCandidateRecord>> {
    throwIfAborted(options);
    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 10);
    const filtered = this.candidates.filter((candidate) => {
      if (query.types?.length && !query.types.includes(candidate.type)) return false;
      if (query.levels?.length && !query.levels.includes(candidate.level)) return false;
      if (query.categories?.length && !query.categories.includes(candidate.category)) {
        return false;
      }
      if (query.states?.length && !query.states.includes(candidate.state)) return false;
      return true;
    });
    const total = filtered.length;
    const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    return {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      pageCount,
    };
  }

  async uploadFiles(
    files: readonly File[],
    options: MutationOptions,
  ): Promise<readonly ClassificationCandidateRecord[]> {
    throwIfAborted(options);
    const uploaded = files.map<ClassificationCandidateRecord>((file, index) => ({
      id: createClassificationCandidateId(
        `candidate_${Date.now()}_${index}_${file.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
      ),
      name: file.name,
      type: "other",
      level: "company",
      category: "administration",
      state: "classifying",
      version: 1,
    }));
    this.candidates.push(...uploaded);
    return uploaded;
  }

  async getPreview(
    candidateId: ClassificationCandidateRecord["id"],
    options?: RepositoryRequestOptions,
  ): Promise<DocumentPreview | null> {
    throwIfAborted(options);
    const candidate = this.candidates.find((item) => item.id === candidateId);
    return candidate
      ? { documentName: candidate.name, content: previewContent }
      : null;
  }

  async confirmCandidates(
    inputs: readonly ConfirmCandidateInput[],
    options: MutationOptions,
  ): Promise<BatchMutationResult<ConfirmedCandidateResult>> {
    throwIfAborted(options);
    const cached = this.confirmedRequests.get(options.idempotencyKey);
    if (cached) return cached;

    const succeeded: ConfirmedCandidateResult[] = [];
    const failed: BatchMutationResult<ConfirmedCandidateResult>["failed"][number][] = [];

    for (const input of inputs) {
      const candidate = this.candidates.find((item) => item.id === input.id);
      if (!candidate) {
        failed.push({ id: input.id, code: "not-found", message: "文件已不在待确认列表中" });
        continue;
      }
      if (candidate.version !== input.expectedVersion) {
        failed.push({ id: input.id, code: "conflict", message: "文件已被其他操作更新，请刷新后重试" });
        continue;
      }
      if (!input.name.trim()) {
        failed.push({ id: input.id, code: "validation", message: "文件名称不能为空" });
        continue;
      }
      if (candidate.state === "classifying" && !input.manualOverride) {
        failed.push({ id: input.id, code: "validation", message: "分类中的文件需要明确使用人工结果" });
        continue;
      }

      const document: DocumentSummary = {
        id: createDocumentId(`doc_${input.id}`),
        name: input.name.trim(),
        type: input.type,
        level: input.level,
        category: input.category,
        state: { kind: "pending", queuedAt: now() },
        operator,
        capabilities: { canDelete: true },
      };
      this.documents.upsert("classification", document);
      this.candidates = this.candidates.filter((item) => item.id !== input.id);
      succeeded.push({ candidateId: input.id, document });
    }

    const result = { succeeded, failed } as const;
    this.confirmedRequests.set(options.idempotencyKey, result);
    return result;
  }

  async softDeleteCandidates(
    inputs: readonly VersionedCandidateInput[],
    options: MutationOptions,
  ): Promise<BatchMutationResult<ClassificationCandidateRecord>> {
    throwIfAborted(options);
    const cached = this.deletedRequests.get(options.idempotencyKey);
    if (cached) return cached;
    const succeeded: ClassificationCandidateRecord[] = [];
    const failed: BatchMutationResult<ClassificationCandidateRecord>["failed"][number][] = [];
    for (const input of inputs) {
      const candidate = this.candidates.find((item) => item.id === input.id);
      if (!candidate) {
        failed.push({ id: input.id, code: "not-found", message: "文件已被删除" });
        continue;
      }
      if (candidate.version !== input.expectedVersion) {
        failed.push({ id: input.id, code: "conflict", message: "文件已被更新，请刷新后重试" });
        continue;
      }
      this.candidates = this.candidates.filter((item) => item.id !== input.id);
      succeeded.push(candidate);
    }
    const result = { succeeded, failed } as const;
    this.deletedRequests.set(options.idempotencyKey, result);
    return result;
  }
}

export class MockClassificationTaskPoolApi
  implements ClassificationTaskPoolApi
{
  constructor(private readonly documents: MockDocumentRepository) {}

  list(query: TaskPoolQuery, options?: RepositoryRequestOptions) {
    return this.documents.list(taskQuery(query, "classification"), options);
  }

  async getPreview(documentId: DocumentId, options?: RepositoryRequestOptions) {
    throwIfAborted(options);
    const document = this.documents.getFromCollection("classification", documentId);
    return document
      ? { documentName: document.name, content: previewContent }
      : null;
  }

  async publish(documentId: DocumentId, options: MutationOptions) {
    throwIfAborted(options);
    const current = this.requireDocument("classification", documentId);
    if (current.state.kind !== "pending" && current.state.kind !== "classified") {
      throw new Error("只有待处理任务可以直接入库");
    }
    const updated: DocumentSummary = {
      ...current,
      state: { kind: "published", source: "classification", publishedAt: now() },
    };
    this.documents.upsert("classification", updated);
    this.documents.upsert("knowledge", updated);
    return updated;
  }

  async startReview(documentId: DocumentId, options: MutationOptions) {
    throwIfAborted(options);
    const current = this.requireDocument("classification", documentId);
    if (current.state.kind !== "pending" && current.state.kind !== "classified") {
      throw new Error("只有待处理任务可以发起审查");
    }
    const reviewTaskId = createReviewTaskId(`review_${documentId}_${Date.now()}`);
    const updated: DocumentSummary = {
      ...current,
      state: {
        kind: "reviewing",
        reviewTaskId,
        startedAt: now(),
        progress: createReviewProgress(0),
      },
    };
    this.documents.upsert("classification", updated);
    this.documents.upsert("review", updated);
    return updated;
  }

  async softDelete(documentId: DocumentId, options: MutationOptions) {
    throwIfAborted(options);
    const current = this.requireDocument("classification", documentId);
    const updated: DocumentSummary = {
      ...current,
      state: {
        kind: "deleted",
        deletedAt: now(),
        previousKind: previousKind(current.state),
        reviewTaskId: getDocumentReviewTaskId(current.state),
        reason: "user-action",
      },
    };
    return this.documents.upsert("classification", updated);
  }

  private requireDocument(collection: "classification", documentId: DocumentId) {
    const document = this.documents.getFromCollection(collection, documentId);
    if (!document) throw new Error("任务不存在或已被移除");
    return document;
  }
}

export class MockReviewTaskPoolApi implements ReviewTaskPoolApi {
  private readonly reports = new Map<string, ReviewReport>();

  constructor(private readonly documents: MockDocumentRepository) {}

  list(query: TaskPoolQuery, options?: RepositoryRequestOptions) {
    return this.documents.list(taskQuery(query, "review"), options);
  }

  async getProgress(reviewTaskId: ReviewTaskId, options?: RepositoryRequestOptions) {
    throwIfAborted(options);
    const document = await this.documents.getByReviewTaskId(reviewTaskId, options);
    return document?.state.kind === "reviewing" ? document.state.progress : 100;
  }

  async getReport(reviewTaskId: ReviewTaskId, options?: RepositoryRequestOptions) {
    throwIfAborted(options);
    const cached = this.readReport(reviewTaskId);
    if (cached) return cached;
    const document = await this.documents.getByReviewTaskId(reviewTaskId, options);
    if (!document || document.state.kind === "reviewing") return null;
    const report = createReviewReport(reviewTaskId, document.name);
    this.writeReport(report);
    return report;
  }

  async createTerminationReport(reviewTaskId: ReviewTaskId, options: MutationOptions) {
    throwIfAborted(options);
    const document = await this.documents.getByReviewTaskId(reviewTaskId, options);
    if (!document) throw new Error("审查任务不存在");
    const progress = document.state.kind === "reviewing" ? document.state.progress : 100;
    const report: ReviewReport = {
      taskId: reviewTaskId,
      documentName: document.name,
      summary: `审查在 ${progress}% 时由人工终止，以下内容为终止前已识别的风险。`,
      risks: createReviewReport(reviewTaskId, document.name).risks.slice(0, 2),
      termination: {
        progress,
        discoveredRiskCount: 2,
        operator: operator.displayName,
        terminatedAt: now(),
      },
    };
    this.writeReport(report);
    return report;
  }

  async ignoreAllRisks(
    reviewTaskId: ReviewTaskId,
    reason: string,
    options: MutationOptions,
  ) {
    throwIfAborted(options);
    const normalizedReason = requireIgnoreReason(reason);
    const report = await this.requireReport(reviewTaskId, options);
    const updated = {
      ...report,
      risks: report.risks.map((risk) =>
        risk.state === "open"
          ? handledRisk(risk, "ignored", normalizedReason)
          : risk,
      ),
    };
    this.writeReport(updated);
    return updated;
  }

  async resolveRisk(
    reviewTaskId: ReviewTaskId,
    riskId: string,
    options: MutationOptions,
  ) {
    throwIfAborted(options);
    const report = await this.requireReport(reviewTaskId, options);
    const updated = updateReviewRisk(report, riskId, (risk) =>
      handledRisk(risk, "resolved"),
    );
    this.writeReport(updated);
    return updated;
  }

  async ignoreRisk(
    reviewTaskId: ReviewTaskId,
    riskId: string,
    reason: string,
    options: MutationOptions,
  ) {
    throwIfAborted(options);
    const normalizedReason = requireIgnoreReason(reason);
    const report = await this.requireReport(reviewTaskId, options);
    const updated = updateReviewRisk(report, riskId, (risk) =>
      handledRisk(risk, "ignored", normalizedReason),
    );
    this.writeReport(updated);
    return updated;
  }

  async publish(documentId: DocumentId, options: MutationOptions) {
    throwIfAborted(options);
    const current = this.requireDocument(documentId);
    if (current.state.kind !== "reviewed") throw new Error("只有已审查任务可以入库");
    const report = await this.requireReport(current.state.reviewTaskId, options);
    if (report.risks.some((risk) => risk.state === "open")) {
      throw new Error("仍有风险未处理，无法入库");
    }
    const updated: DocumentSummary = {
      ...current,
      state: {
        kind: "published",
        source: "review",
        reviewTaskId: current.state.reviewTaskId,
        publishedAt: now(),
      },
    };
    this.documents.upsert("review", updated);
    this.documents.upsert("knowledge", updated);
    return updated;
  }

  async softDelete(documentId: DocumentId, options: MutationOptions) {
    throwIfAborted(options);
    const current = this.requireDocument(documentId);
    const reviewTaskId = getDocumentReviewTaskId(current.state);
    if (!reviewTaskId) throw new Error("审查任务缺少报告标识");
    if (current.state.kind === "reviewing") {
      await this.createTerminationReport(reviewTaskId, options);
    }
    const updated: DocumentSummary = {
      ...current,
      state: {
        kind: "deleted",
        deletedAt: now(),
        previousKind: previousKind(current.state),
        reviewTaskId,
        reason: "user-action",
      },
    };
    return this.documents.upsert("review", updated);
  }

  private requireDocument(documentId: DocumentId) {
    const document = this.documents.getFromCollection("review", documentId);
    if (!document) throw new Error("审查任务不存在或已被移除");
    return document;
  }

  private async requireReport(
    reviewTaskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<ReviewReport> {
    const report = await this.getReport(reviewTaskId, options);
    if (!report) throw new Error("审查报告尚未生成");
    return report;
  }

  private readReport(reviewTaskId: ReviewTaskId): ReviewReport | undefined {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(reviewReportStorageKey);
      if (stored) {
        try {
          const reports = JSON.parse(stored) as Record<string, ReviewReport>;
          const report = reports[reviewTaskId];
          if (report) return normalizeMockReport(report);
        } catch {
          window.localStorage.removeItem(reviewReportStorageKey);
        }
      }
    }
    const report = this.reports.get(reviewTaskId);
    return report ? normalizeMockReport(report) : undefined;
  }

  private writeReport(report: ReviewReport): void {
    this.reports.set(report.taskId, report);
    if (typeof window === "undefined") return;
    let reports: Record<string, ReviewReport> = {};
    const stored = window.localStorage.getItem(reviewReportStorageKey);
    if (stored) {
      try {
        reports = JSON.parse(stored) as Record<string, ReviewReport>;
      } catch {
        reports = {};
      }
    }
    reports[report.taskId] = report;
    window.localStorage.setItem(reviewReportStorageKey, JSON.stringify(reports));
  }
}

export class MockKnowledgeApi implements KnowledgeApi {
  constructor(private readonly documents: MockDocumentRepository) {}

  list(query: TaskPoolQuery, options?: RepositoryRequestOptions) {
    return this.documents.list(taskQuery(query, "knowledge"), options);
  }

  async getPreview(documentId: DocumentId, options?: RepositoryRequestOptions) {
    throwIfAborted(options);
    const document = this.documents.getFromCollection("knowledge", documentId);
    return document
      ? { documentName: document.name, content: previewContent }
      : null;
  }

  async getReport(documentId: DocumentId, options?: RepositoryRequestOptions) {
    throwIfAborted(options);
    const document = this.documents.getFromCollection("knowledge", documentId);
    const reviewTaskId = document && getDocumentReviewTaskId(document.state);
    if (!document || !reviewTaskId) return null;
    return {
      documentName: document.name,
      content: `审查报告 ${reviewTaskId}：风险项和处理记录已随知识条目保留。`,
    };
  }

  async getGraph(options?: RepositoryRequestOptions) {
    throwIfAborted(options);
    const knowledge = await this.documents.list({
      collection: "knowledge",
      page: 1,
      pageSize: 1000,
    });
    return {
      nodes: knowledge.items.map((document) => ({
        id: document.id,
        label: document.name,
      })),
      edges: knowledge.items.slice(1).map((document, index) => ({
        source: knowledge.items[index]?.id ?? document.id,
        target: document.id,
        relation: "知识关联",
      })),
    };
  }

  async softDelete(documentId: DocumentId, options: MutationOptions) {
    throwIfAborted(options);
    const current = this.documents.getFromCollection("knowledge", documentId);
    if (!current) throw new Error("知识条目不存在或已被删除");
    this.documents.remove("knowledge", documentId);
    const reviewTaskId = getDocumentReviewTaskId(current.state);
    const contractTaskId = getDocumentContractTaskId(current.state);
    const sourceCollection = reviewTaskId ? "review" : "classification";
    const source = contractTaskId
      ? null
      : this.documents.getFromCollection(sourceCollection, documentId);
    if (source) {
      this.documents.upsert(sourceCollection, {
        ...source,
        state: {
          kind: "deleted",
          deletedAt: now(),
          previousKind: previousKind(source.state),
          reviewTaskId,
          contractTaskId,
          reason: "knowledge-deleted",
        },
      });
    }
    const deleted: DocumentSummary = {
      ...current,
      state: {
        kind: "deleted",
        deletedAt: now(),
        previousKind: previousKind(current.state),
        reviewTaskId,
        contractTaskId,
        reason: "knowledge-deleted",
      },
    };
    return deleted;
  }
}
