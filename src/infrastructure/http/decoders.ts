import type {
  AuthSession,
  AuthUser,
  LoginResult,
  RegisterResult,
} from "../../features/auth";
import {
  isContractEditorSession,
  type ContractReviewTask,
  type ContractRisk,
} from "../../features/contracts";
import type {
  BatchMutationResult,
  ClassificationCandidateStats,
  ClassificationCandidateRecord,
  ConfirmedCandidateResult,
  DocumentPreview,
  KnowledgeGraph,
  PageResult,
  ReviewReport,
  ReviewRisk,
} from "../../features/documents/application";
import {
  createClassificationCandidateId,
  createDocumentId,
  createIsoDateTime,
  createReviewProgress,
  createReviewTaskId,
  createUserId,
  documentCategoryCodes,
  documentLevelCodes,
  documentTypeCodes,
  type DocumentState,
  type DocumentSummary,
} from "../../features/documents/domain";
import type {
  ChatConversation,
  ChatMessage,
  DashboardOverview,
} from "../../app/services";
import { ResponseValidationError } from "./errors";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ResponseValidationError(`${label} 必须是对象`);
  }
  return value as JsonRecord;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ResponseValidationError(`${label} 必须是字符串`);
  }
  return value;
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ResponseValidationError(`${label} 必须是有限数字`);
  }
  return value;
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new ResponseValidationError(`${label} 必须是数组`);
  }
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  return value === undefined || value === null ? undefined : string(value, label);
}

function oneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
  label: string,
): T[number] {
  const candidate = string(value, label);
  if (!values.includes(candidate)) {
    throw new ResponseValidationError(`${label} 的值不受支持：${candidate}`);
  }
  return candidate as T[number];
}

function decodeAuthUser(value: unknown): AuthUser {
  const input = record(value, "session.user");
  return {
    id: string(input.id, "session.user.id"),
    username: string(input.username, "session.user.username"),
    displayName: string(input.displayName, "session.user.displayName"),
    roleLabel: string(input.roleLabel, "session.user.roleLabel"),
    permissions: array(input.permissions, "session.user.permissions").map(
      (permission, index) =>
        string(permission, `session.user.permissions[${index}]`),
    ),
  };
}

export function decodeAuthSession(value: unknown): AuthSession {
  const input = record(value, "session");
  return {
    user: decodeAuthUser(input.user),
    expiresAt: string(input.expiresAt, "session.expiresAt"),
    csrfToken: string(input.csrfToken, "session.csrfToken"),
  };
}

export function decodeNullableAuthSession(value: unknown): AuthSession | null {
  return value === null ? null : decodeAuthSession(value);
}

export function decodeLoginResult(value: unknown): LoginResult {
  const input = record(value, "loginResult");
  return {
    status: oneOf(input.status, ["authenticated"] as const, "loginResult.status"),
    message: string(input.message, "loginResult.message"),
    session: decodeAuthSession(input.session),
  };
}

export function decodeRegisterResult(value: unknown): RegisterResult {
  const input = record(value, "registerResult");
  return {
    status: oneOf(
      input.status,
      ["submitted", "unavailable"] as const,
      "registerResult.status",
    ),
    message: string(input.message, "registerResult.message"),
  };
}

function decodeDocumentState(value: unknown): DocumentState {
  const input = record(value, "document.state");
  const kind = oneOf(
    input.kind,
    ["pending", "classified", "reviewing", "reviewed", "published", "deleted"] as const,
    "document.state.kind",
  );
  if (kind === "pending") {
    return {
      kind,
      queuedAt: createIsoDateTime(string(input.queuedAt, "state.queuedAt")),
    };
  }
  if (kind === "classified") {
    return {
      kind,
      classifiedAt: createIsoDateTime(
        string(input.classifiedAt, "state.classifiedAt"),
      ),
    };
  }
  if (kind === "reviewing") {
    return {
      kind,
      reviewTaskId: createReviewTaskId(
        string(input.reviewTaskId, "state.reviewTaskId"),
      ),
      startedAt: createIsoDateTime(string(input.startedAt, "state.startedAt")),
      progress: createReviewProgress(number(input.progress, "state.progress")),
    };
  }
  if (kind === "reviewed") {
    return {
      kind,
      reviewTaskId: createReviewTaskId(
        string(input.reviewTaskId, "state.reviewTaskId"),
      ),
      reviewedAt: createIsoDateTime(
        string(input.reviewedAt, "state.reviewedAt"),
      ),
    };
  }
  if (kind === "published") {
    const source = oneOf(
      input.source,
      ["classification", "review", "contract-review"] as const,
      "state.source",
    );
    const publishedAt = createIsoDateTime(
      string(input.publishedAt, "state.publishedAt"),
    );
    if (source === "review") {
      return {
        kind,
        source,
        reviewTaskId: createReviewTaskId(
          string(input.reviewTaskId, "state.reviewTaskId"),
        ),
        publishedAt,
      };
    }
    if (source === "contract-review") {
      return {
        kind,
        source,
        contractTaskId: string(input.contractTaskId, "state.contractTaskId"),
        publishedAt,
      };
    }
    return { kind, source, publishedAt };
  }

  const previousKind = input.previousKind === undefined
    ? undefined
    : oneOf(
        input.previousKind,
        ["pending", "classified", "reviewing", "reviewed", "published"] as const,
        "state.previousKind",
      );
  const reason = input.reason === undefined
    ? undefined
    : oneOf(
        input.reason,
        ["user-action", "knowledge-deleted"] as const,
        "state.reason",
      );
  const reviewTaskId = optionalString(input.reviewTaskId, "state.reviewTaskId");
  return {
    kind,
    deletedAt: createIsoDateTime(string(input.deletedAt, "state.deletedAt")),
    ...(previousKind ? { previousKind } : {}),
    ...(reviewTaskId
      ? { reviewTaskId: createReviewTaskId(reviewTaskId) }
      : {}),
    ...(optionalString(input.contractTaskId, "state.contractTaskId")
      ? {
          contractTaskId: string(
            input.contractTaskId,
            "state.contractTaskId",
          ),
        }
      : {}),
    ...(reason ? { reason } : {}),
  };
}

export function decodeDocumentSummary(value: unknown): DocumentSummary {
  const input = record(value, "document");
  const operator = record(input.operator, "document.operator");
  return {
    id: createDocumentId(string(input.id, "document.id")),
    name: string(input.name, "document.name"),
    type: oneOf(input.type, documentTypeCodes, "document.type"),
    level: oneOf(input.level, documentLevelCodes, "document.level"),
    category: oneOf(input.category, documentCategoryCodes, "document.category"),
    state: decodeDocumentState(input.state),
    operator: {
      id: createUserId(string(operator.id, "document.operator.id")),
      displayName: string(
        operator.displayName,
        "document.operator.displayName",
      ),
    },
  };
}

export function decodeCandidate(
  value: unknown,
): ClassificationCandidateRecord {
  const input = record(value, "candidate");
  return {
    id: createClassificationCandidateId(string(input.id, "candidate.id")),
    name: string(input.name, "candidate.name"),
    type: oneOf(input.type, documentTypeCodes, "candidate.type"),
    level: oneOf(input.level, documentLevelCodes, "candidate.level"),
    category: oneOf(input.category, documentCategoryCodes, "candidate.category"),
    state: oneOf(
      input.state,
      ["classifying", "awaiting-confirmation"] as const,
      "candidate.state",
    ),
    version: number(input.version, "candidate.version"),
  };
}

export function decodeCandidateArray(
  value: unknown,
): readonly ClassificationCandidateRecord[] {
  return array(value, "candidates").map(decodeCandidate);
}

export function decodeCandidateStats(
  value: unknown,
): ClassificationCandidateStats {
  const input = record(value, "candidateStats");
  return {
    total: number(input.total, "candidateStats.total"),
    classifying: number(input.classifying, "candidateStats.classifying"),
    awaitingConfirmation: number(
      input.awaitingConfirmation,
      "candidateStats.awaitingConfirmation",
    ),
  };
}

export function decodeConfirmedCandidateBatchResult(
  value: unknown,
): BatchMutationResult<ConfirmedCandidateResult> {
  const input = record(value, "batchResult");
  return {
    succeeded: array(input.succeeded, "batchResult.succeeded").map(
      (item, index) => {
        const result = record(item, `batchResult.succeeded[${index}]`);
        return {
          candidateId: createClassificationCandidateId(
            string(
              result.candidateId,
              `batchResult.succeeded[${index}].candidateId`,
            ),
          ),
          document: decodeDocumentSummary(result.document),
        };
      },
    ),
    failed: decodeBatchFailures(input.failed),
  };
}

export function decodeCandidateBatchResult(
  value: unknown,
): BatchMutationResult<ClassificationCandidateRecord> {
  const input = record(value, "batchResult");
  return {
    succeeded: array(input.succeeded, "batchResult.succeeded").map(
      decodeCandidate,
    ),
    failed: decodeBatchFailures(input.failed),
  };
}

function decodeBatchFailures(value: unknown) {
  return array(value, "batchResult.failed").map((failure, index) => {
    const item = record(failure, `batchResult.failed[${index}]`);
    return {
      id: string(item.id, `batchResult.failed[${index}].id`),
      code: oneOf(
        item.code,
        ["not-found", "validation", "conflict", "unavailable"] as const,
        `batchResult.failed[${index}].code`,
      ),
      message: string(
        item.message,
        `batchResult.failed[${index}].message`,
      ),
    };
  });
}

export function decodePageResult<T>(
  value: unknown,
  decodeItem: (item: unknown) => T,
): PageResult<T> {
  const input = record(value, "pageResult");
  return {
    items: array(input.items, "pageResult.items").map(decodeItem),
    page: number(input.page, "pageResult.page"),
    pageSize: number(input.pageSize, "pageResult.pageSize"),
    total: number(input.total, "pageResult.total"),
    pageCount: number(input.pageCount, "pageResult.pageCount"),
  };
}

export function decodeDocumentPreview(value: unknown): DocumentPreview {
  const input = record(value, "documentPreview");
  return {
    documentName: string(input.documentName, "documentPreview.documentName"),
    content: string(input.content, "documentPreview.content"),
  };
}

function decodeReviewRisk(value: unknown): ReviewRisk {
  const input = record(value, "reviewRisk");
  const resolution = input.resolution === undefined
    ? undefined
    : record(input.resolution, "reviewRisk.resolution");
  return {
    id: string(input.id, "reviewRisk.id"),
    category: oneOf(
      input.category,
      ["semantic", "conflict", "consistency"] as const,
      "reviewRisk.category",
    ),
    level: oneOf(
      input.level,
      ["high", "medium", "low"] as const,
      "reviewRisk.level",
    ),
    title: string(input.title, "reviewRisk.title"),
    summary: string(input.summary, "reviewRisk.summary"),
    evidence: string(input.evidence, "reviewRisk.evidence"),
    suggestion: string(input.suggestion, "reviewRisk.suggestion"),
    state: oneOf(
      input.state,
      ["open", "resolved", "ignored"] as const,
      "reviewRisk.state",
    ),
    ...(resolution
      ? {
          resolution: {
            operator: string(
              resolution.operator,
              "reviewRisk.resolution.operator",
            ),
            handledAt: string(
              resolution.handledAt,
              "reviewRisk.resolution.handledAt",
            ),
            ...(optionalString(
              resolution.reason,
              "reviewRisk.resolution.reason",
            )
              ? {
                  reason: string(
                    resolution.reason,
                    "reviewRisk.resolution.reason",
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
}

export function decodeReviewReport(value: unknown): ReviewReport {
  const input = record(value, "reviewReport");
  const termination = input.termination === undefined
    ? undefined
    : record(input.termination, "reviewReport.termination");
  return {
    taskId: createReviewTaskId(string(input.taskId, "reviewReport.taskId")),
    documentName: string(input.documentName, "reviewReport.documentName"),
    summary: string(input.summary, "reviewReport.summary"),
    risks: array(input.risks, "reviewReport.risks").map(decodeReviewRisk),
    ...(termination
      ? {
          termination: {
            progress: number(
              termination.progress,
              "reviewReport.termination.progress",
            ),
            discoveredRiskCount: number(
              termination.discoveredRiskCount,
              "reviewReport.termination.discoveredRiskCount",
            ),
            operator: string(
              termination.operator,
              "reviewReport.termination.operator",
            ),
            terminatedAt: string(
              termination.terminatedAt,
              "reviewReport.termination.terminatedAt",
            ),
          },
        }
      : {}),
  };
}

export function decodeKnowledgeGraph(value: unknown): KnowledgeGraph {
  const input = record(value, "knowledgeGraph");
  return {
    nodes: array(input.nodes, "knowledgeGraph.nodes").map((node, index) => {
      const item = record(node, `knowledgeGraph.nodes[${index}]`);
      return {
        id: string(item.id, `knowledgeGraph.nodes[${index}].id`),
        label: string(item.label, `knowledgeGraph.nodes[${index}].label`),
      };
    }),
    edges: array(input.edges, "knowledgeGraph.edges").map((edge, index) => {
      const item = record(edge, `knowledgeGraph.edges[${index}]`);
      return {
        source: string(item.source, `knowledgeGraph.edges[${index}].source`),
        target: string(item.target, `knowledgeGraph.edges[${index}].target`),
        relation: string(
          item.relation,
          `knowledgeGraph.edges[${index}].relation`,
        ),
      };
    }),
  };
}

function decodeContractRisk(value: unknown): ContractRisk {
  const input = record(value, "contractRisk");
  const resolution = input.resolution === undefined
    ? undefined
    : record(input.resolution, "contractRisk.resolution");
  return {
    id: string(input.id, "contractRisk.id"),
    clauseId: string(input.clauseId, "contractRisk.clauseId"),
    moduleId: oneOf(
      input.moduleId,
      [
        "transaction",
        "performance-payment",
        "compliance",
        "data-security",
        "intellectual-property",
        "termination",
      ] as const,
      "contractRisk.moduleId",
    ),
    level: oneOf(
      input.level,
      ["high", "medium", "low"] as const,
      "contractRisk.level",
    ),
    title: string(input.title, "contractRisk.title"),
    summary: string(input.summary, "contractRisk.summary"),
    suggestion: string(input.suggestion, "contractRisk.suggestion"),
    originalText: string(input.originalText, "contractRisk.originalText"),
    state: oneOf(
      input.state,
      ["open", "resolved", "ignored"] as const,
      "contractRisk.state",
    ),
    ...(resolution
      ? {
          resolution: {
            operator: string(
              resolution.operator,
              "contractRisk.resolution.operator",
            ),
            handledAt: string(
              resolution.handledAt,
              "contractRisk.resolution.handledAt",
            ),
            ...(optionalString(
              resolution.reason,
              "contractRisk.resolution.reason",
            )
              ? {
                  reason: string(
                    resolution.reason,
                    "contractRisk.resolution.reason",
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
}

export function decodeContractReviewTask(value: unknown): ContractReviewTask {
  const input = record(value, "contractReviewTask");
  return {
    id: string(input.id, "contractReviewTask.id"),
    version: number(input.version, "contractReviewTask.version"),
    name: string(input.name, "contractReviewTask.name"),
    size: number(input.size, "contractReviewTask.size"),
    stance: oneOf(
      input.stance,
      ["party-a", "party-b", "neutral"] as const,
      "contractReviewTask.stance",
    ),
    modules: array(input.modules, "contractReviewTask.modules").map(
      (moduleId, index) =>
        oneOf(
          moduleId,
          [
            "transaction",
            "performance-payment",
            "compliance",
            "data-security",
            "intellectual-property",
            "termination",
          ] as const,
          `contractReviewTask.modules[${index}]`,
        ),
    ),
    status: oneOf(
      input.status,
      ["queued", "reviewing", "reported", "stored"] as const,
      "contractReviewTask.status",
    ),
    progress: number(input.progress, "contractReviewTask.progress"),
    createdAt: string(input.createdAt, "contractReviewTask.createdAt"),
    clauses: array(input.clauses, "contractReviewTask.clauses").map(
      (clause, index) => {
        const item = record(clause, `contractReviewTask.clauses[${index}]`);
        return {
          id: string(item.id, `contractReviewTask.clauses[${index}].id`),
          number: string(
            item.number,
            `contractReviewTask.clauses[${index}].number`,
          ),
          title: string(
            item.title,
            `contractReviewTask.clauses[${index}].title`,
          ),
          text: string(
            item.text,
            `contractReviewTask.clauses[${index}].text`,
          ),
        };
      },
    ),
    risks: array(input.risks, "contractReviewTask.risks").map(
      decodeContractRisk,
    ),
  };
}

export function decodeContractReviewTaskArray(
  value: unknown,
): readonly ContractReviewTask[] {
  return array(value, "contractReviewTasks").map(decodeContractReviewTask);
}

export function decodeContractEditorSession(value: unknown) {
  if (!isContractEditorSession(value)) {
    throw new ResponseValidationError("合同编辑器会话结构无效");
  }
  return value;
}

export function decodeDashboardOverview(value: unknown): DashboardOverview {
  const input = record(value, "dashboardOverview");
  return {
    todos: array(input.todos, "dashboardOverview.todos").map(
      (todo, index) => {
        const item = record(todo, `dashboardOverview.todos[${index}]`);
        const count = number(
          item.count,
          `dashboardOverview.todos[${index}].count`,
        );
        if (!Number.isInteger(count) || count < 0) {
          throw new ResponseValidationError(
            `dashboardOverview.todos[${index}].count 必须是非负整数`,
          );
        }
        return {
          kind: oneOf(
            item.kind,
            [
              "classification-confirmation",
              "classification-task",
              "review-progress",
              "review-report",
              "contract-review",
            ] as const,
            `dashboardOverview.todos[${index}].kind`,
          ),
          count,
        };
      },
    ),
    metrics: array(input.metrics, "dashboardOverview.metrics").map(
      (metric, index) => {
        const item = record(metric, `dashboardOverview.metrics[${index}]`);
        return {
          label: string(
            item.label,
            `dashboardOverview.metrics[${index}].label`,
          ),
          value: string(
            item.value,
            `dashboardOverview.metrics[${index}].value`,
          ),
        };
      },
    ),
  };
}

function decodeChatMessage(value: unknown): ChatMessage {
  const input = record(value, "chatMessage");
  return {
    id: string(input.id, "chatMessage.id"),
    role: oneOf(
      input.role,
      ["user", "assistant"] as const,
      "chatMessage.role",
    ),
    content: string(input.content, "chatMessage.content"),
    createdAt: string(input.createdAt, "chatMessage.createdAt"),
    citations: array(input.citations, "chatMessage.citations").map(
      (citation, index) => {
        const item = record(citation, `chatMessage.citations[${index}]`);
        return {
          documentId: string(
            item.documentId,
            `chatMessage.citations[${index}].documentId`,
          ),
          documentName: string(
            item.documentName,
            `chatMessage.citations[${index}].documentName`,
          ),
          excerpt: string(
            item.excerpt,
            `chatMessage.citations[${index}].excerpt`,
          ),
        };
      },
    ),
  };
}

export function decodeChatConversation(value: unknown): ChatConversation {
  const input = record(value, "chatConversation");
  return {
    id: string(input.id, "chatConversation.id"),
    title: string(input.title, "chatConversation.title"),
    createdAt: string(input.createdAt, "chatConversation.createdAt"),
    updatedAt: string(input.updatedAt, "chatConversation.updatedAt"),
    messages: array(input.messages, "chatConversation.messages").map(
      decodeChatMessage,
    ),
  };
}

export function decodeChatConversationArray(
  value: unknown,
): readonly ChatConversation[] {
  return array(value, "chatConversations").map(decodeChatConversation);
}

export function decodeChatMessageResult(value: unknown): ChatMessage {
  return decodeChatMessage(value);
}
