import type {
  AppServices,
  ChatApi,
  ChatConversation,
  ChatMessage,
  DashboardApi,
} from "../../app/services";
import type {
  AuthApi,
  AuthSession,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
} from "../../features/auth/AuthApi";
import type {
  ContractReviewApi,
  ContractMutationOptions,
  ContractRequestOptions,
  CreateContractReviewTaskCommand,
} from "../../features/contracts/application";
import type {
  ContractReviewTask,
  ContractRiskState,
} from "../../features/contracts/domain";
import type {
  BatchMutationResult,
  ClassificationCandidateQuery,
  ClassificationCandidateRecord,
  ClassificationCandidateStats,
  ClassificationTaskPoolApi,
  ClassificationWorkflowApi,
  ConfirmCandidateInput,
  ConfirmedCandidateResult,
  DocumentPreview,
  DocumentQuery,
  DocumentRepository,
  KnowledgeApi,
  KnowledgeGraph,
  MutationOptions,
  PageResult,
  RepositoryRequestOptions,
  ReviewTaskPoolApi,
  TaskPoolQuery,
  VersionedCandidateInput,
} from "../../features/documents/application";
import type {
  ClassificationCandidateId,
  DocumentId,
  DocumentSummary,
  ReviewTaskId,
} from "../../features/documents/domain";
import {
  decodeCandidate,
  decodeCandidateArray,
  decodeCandidateBatchResult,
  decodeCandidateStats,
  decodeChatConversation,
  decodeChatConversationArray,
  decodeChatMessageResult,
  decodeConfirmedCandidateBatchResult,
  decodeContractEditorSession,
  decodeContractEditorFinalizeResult,
  decodeContractReviewTask,
  decodeContractReviewTaskArray,
  decodeDashboardOverview,
  decodeDocumentPreview,
  decodeDocumentSummary,
  decodeKnowledgeGraph,
  decodeLoginResult,
  decodeNullableAuthSession,
  decodePageResult,
  decodeRegisterResult,
  decodeReviewReport,
} from "./decoders";
import { HttpClient, type HttpClientOptions } from "./HttpClient";
import type { QueryParameters } from "./types";
import { uploadFileToObjectStorage, uploadFilesToObjectStorage } from "./upload";

function taskQuery(query: TaskPoolQuery): QueryParameters {
  return {
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    type: query.types,
    level: query.levels,
    state: query.states,
    sortBy: query.sort?.by,
    sortDirection: query.sort?.direction,
  };
}

function candidateQuery(query: ClassificationCandidateQuery): QueryParameters {
  return {
    page: query.page,
    pageSize: query.pageSize,
    type: query.types,
    level: query.levels,
    category: query.categories,
    state: query.states,
  };
}

function mutationOptions(options: MutationOptions) {
  return {
    signal: options.signal,
    idempotencyKey: options.idempotencyKey,
  };
}

function versionHeaders(expectedVersion: number | undefined) {
  return expectedVersion === undefined
    ? undefined
    : { "If-Match": `"${expectedVersion}"` };
}

function nullable<T>(decoder: (value: unknown) => T) {
  return (value: unknown): T | null => value === null ? null : decoder(value);
}

export class AuthHttpAdapter implements AuthApi {
  constructor(private readonly client: HttpClient) {}

  async login(payload: LoginPayload) {
    const result = await this.client.request("/auth/login", {
      method: "POST",
      body: payload,
      decode: decodeLoginResult,
    });
    this.client.setCsrfToken(result.session.csrfToken);
    return result;
  }

  async register(payload: RegisterPayload): Promise<RegisterResult> {
    return this.client.request("/auth/registrations", {
      method: "POST",
      body: payload,
      decode: decodeRegisterResult,
    });
  }

  async getSession(): Promise<AuthSession | null> {
    const session = await this.client.request("/auth/session", {
      decode: decodeNullableAuthSession,
    });
    this.client.setCsrfToken(session?.csrfToken);
    return session;
  }

  async logout(): Promise<void> {
    await this.client.request("/auth/logout", { method: "POST" });
    this.client.setCsrfToken(undefined);
  }
}

export class DashboardHttpAdapter implements DashboardApi {
  constructor(private readonly client: HttpClient) {}

  getOverview() {
    return this.client.request("/dashboard/overview", {
      decode: decodeDashboardOverview,
    });
  }
}

export class ClassificationWorkflowHttpAdapter
  implements ClassificationWorkflowApi
{
  constructor(private readonly client: HttpClient) {}

  getStats(options?: RepositoryRequestOptions): Promise<ClassificationCandidateStats> {
    return this.client.request("/classification/candidates/stats", {
      signal: options?.signal,
      decode: decodeCandidateStats,
    });
  }

  listCandidates(
    query: ClassificationCandidateQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<ClassificationCandidateRecord>> {
    return this.client.request("/classification/candidates", {
      query: candidateQuery(query),
      signal: options?.signal,
      decode: (value) => decodePageResult(value, decodeCandidate),
    });
  }

  async uploadFiles(
    files: readonly File[],
    options: MutationOptions,
  ): Promise<readonly ClassificationCandidateRecord[]> {
    const uploadedFiles = await uploadFilesToObjectStorage(this.client, files, {
      ...mutationOptions(options),
      idempotencyKey: options.idempotencyKey,
    });
    return this.client.request("/classification/candidates/batch", {
      method: "POST",
      body: {
        files: uploadedFiles.map((file) => ({ fileId: file.id })),
      },
      ...mutationOptions(options),
      decode: decodeCandidateArray,
    });
  }

  getPreview(
    candidateId: ClassificationCandidateId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentPreview | null> {
    return this.client.request(
      `/classification/candidates/${encodeURIComponent(candidateId)}/preview`,
      {
        signal: options?.signal,
        decode: nullable(decodeDocumentPreview),
      },
    );
  }

  confirmCandidates(
    candidates: readonly ConfirmCandidateInput[],
    options: MutationOptions,
  ): Promise<BatchMutationResult<ConfirmedCandidateResult>> {
    return this.client.request("/classification/candidates/batch-confirm", {
      method: "POST",
      body: { items: candidates },
      ...mutationOptions(options),
      decode: decodeConfirmedCandidateBatchResult,
    });
  }

  softDeleteCandidates(
    candidates: readonly VersionedCandidateInput[],
    options: MutationOptions,
  ): Promise<BatchMutationResult<ClassificationCandidateRecord>> {
    return this.client.request("/classification/candidates/batch-delete", {
      method: "POST",
      body: { items: candidates },
      ...mutationOptions(options),
      decode: decodeCandidateBatchResult,
    });
  }
}

export class ClassificationTaskPoolHttpAdapter
  implements ClassificationTaskPoolApi
{
  constructor(private readonly client: HttpClient) {}

  list(query: TaskPoolQuery, options?: RepositoryRequestOptions) {
    return this.client.request("/classification-tasks", {
      query: taskQuery(query),
      signal: options?.signal,
      decode: (value) => decodePageResult(value, decodeDocumentSummary),
    });
  }

  getPreview(documentId: DocumentId, options?: RepositoryRequestOptions) {
    return this.client.request(
      `/classification-tasks/${encodeURIComponent(documentId)}/preview`,
      {
        signal: options?.signal,
        decode: nullable(decodeDocumentPreview),
      },
    );
  }

  publish(documentId: DocumentId, options: MutationOptions) {
    return this.client.request(
      `/classification-tasks/${encodeURIComponent(documentId)}/publish`,
      {
        method: "POST",
        ...mutationOptions(options),
        decode: decodeDocumentSummary,
      },
    );
  }

  startReview(documentId: DocumentId, options: MutationOptions) {
    return this.client.request(
      `/classification-tasks/${encodeURIComponent(documentId)}/start-review`,
      {
        method: "POST",
        ...mutationOptions(options),
        decode: decodeDocumentSummary,
      },
    );
  }

  softDelete(documentId: DocumentId, options: MutationOptions) {
    return this.client.request(
      `/classification-tasks/${encodeURIComponent(documentId)}`,
      {
        method: "DELETE",
        ...mutationOptions(options),
        decode: decodeDocumentSummary,
      },
    );
  }
}

export class ReviewTaskPoolHttpAdapter implements ReviewTaskPoolApi {
  constructor(private readonly client: HttpClient) {}

  list(query: TaskPoolQuery, options?: RepositoryRequestOptions) {
    return this.client.request("/review-tasks", {
      query: taskQuery(query),
      signal: options?.signal,
      decode: (value) => decodePageResult(value, decodeDocumentSummary),
    });
  }

  async getProgress(
    reviewTaskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<number> {
    const result = await this.client.request<{ readonly progress: number }>(
      `/review-tasks/${encodeURIComponent(reviewTaskId)}/progress`,
      { signal: options?.signal },
    );
    return result.progress;
  }

  getReport(reviewTaskId: ReviewTaskId, options?: RepositoryRequestOptions) {
    return this.client.request(
      `/review-tasks/${encodeURIComponent(reviewTaskId)}/report`,
      {
        signal: options?.signal,
        decode: nullable(decodeReviewReport),
      },
    );
  }

  createTerminationReport(
    reviewTaskId: ReviewTaskId,
    options: MutationOptions,
  ) {
    return this.client.request(
      `/review-tasks/${encodeURIComponent(reviewTaskId)}/termination-report`,
      {
        method: "POST",
        ...mutationOptions(options),
        decode: decodeReviewReport,
      },
    );
  }

  ignoreAllRisks(
    reviewTaskId: ReviewTaskId,
    reason: string,
    options: MutationOptions,
  ) {
    return this.client.request(
      `/review-tasks/${encodeURIComponent(reviewTaskId)}/risks/batch-ignore`,
      {
        method: "POST",
        body: { reason },
        ...mutationOptions(options),
        decode: decodeReviewReport,
      },
    );
  }

  resolveRisk(
    reviewTaskId: ReviewTaskId,
    riskId: string,
    options: MutationOptions,
  ) {
    return this.client.request(
      `/review-tasks/${encodeURIComponent(reviewTaskId)}/risks/${encodeURIComponent(riskId)}/resolve`,
      {
        method: "POST",
        ...mutationOptions(options),
        decode: decodeReviewReport,
      },
    );
  }

  ignoreRisk(
    reviewTaskId: ReviewTaskId,
    riskId: string,
    reason: string,
    options: MutationOptions,
  ) {
    return this.client.request(
      `/review-tasks/${encodeURIComponent(reviewTaskId)}/risks/${encodeURIComponent(riskId)}/ignore`,
      {
        method: "POST",
        body: { reason },
        ...mutationOptions(options),
        decode: decodeReviewReport,
      },
    );
  }

  publish(documentId: DocumentId, options: MutationOptions) {
    return this.client.request(
      `/review-tasks/by-document/${encodeURIComponent(documentId)}/publish`,
      {
        method: "POST",
        ...mutationOptions(options),
        decode: decodeDocumentSummary,
      },
    );
  }

  softDelete(documentId: DocumentId, options: MutationOptions) {
    return this.client.request(
      `/review-tasks/by-document/${encodeURIComponent(documentId)}`,
      {
        method: "DELETE",
        ...mutationOptions(options),
        decode: decodeDocumentSummary,
      },
    );
  }
}

export class KnowledgeHttpAdapter implements KnowledgeApi {
  constructor(private readonly client: HttpClient) {}

  list(query: TaskPoolQuery, options?: RepositoryRequestOptions) {
    return this.client.request("/knowledge", {
      query: taskQuery(query),
      signal: options?.signal,
      decode: (value) => decodePageResult(value, decodeDocumentSummary),
    });
  }

  getPreview(documentId: DocumentId, options?: RepositoryRequestOptions) {
    return this.client.request(
      `/knowledge/${encodeURIComponent(documentId)}/preview`,
      {
        signal: options?.signal,
        decode: nullable(decodeDocumentPreview),
      },
    );
  }

  getReport(documentId: DocumentId, options?: RepositoryRequestOptions) {
    return this.client.request(
      `/knowledge/${encodeURIComponent(documentId)}/report`,
      {
        signal: options?.signal,
        decode: nullable(decodeDocumentPreview),
      },
    );
  }

  getGraph(options?: RepositoryRequestOptions): Promise<KnowledgeGraph> {
    return this.client.request("/knowledge/graph", {
      signal: options?.signal,
      decode: decodeKnowledgeGraph,
    });
  }

  softDelete(documentId: DocumentId, options: MutationOptions) {
    return this.client.request(`/knowledge/${encodeURIComponent(documentId)}`, {
      method: "DELETE",
      ...mutationOptions(options),
      decode: decodeDocumentSummary,
    });
  }
}

export class DocumentRepositoryHttpAdapter implements DocumentRepository {
  constructor(private readonly client: HttpClient) {}

  list(query: DocumentQuery, options?: RepositoryRequestOptions) {
    const path = query.collection === "classification"
      ? "/classification-tasks"
      : query.collection === "review"
        ? "/review-tasks"
        : "/knowledge";
    return this.client.request(path, {
      query: taskQuery(query),
      signal: options?.signal,
      decode: (value) => decodePageResult(value, decodeDocumentSummary),
    });
  }

  getById(
    id: DocumentId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentSummary | null> {
    return this.client.request(`/documents/${encodeURIComponent(id)}`, {
      signal: options?.signal,
      decode: nullable(decodeDocumentSummary),
    });
  }

  getByReviewTaskId(
    taskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentSummary | null> {
    return this.client.request(
      `/review-tasks/${encodeURIComponent(taskId)}/document`,
      {
        signal: options?.signal,
        decode: nullable(decodeDocumentSummary),
      },
    );
  }
}

export class ContractReviewHttpAdapter implements ContractReviewApi {
  constructor(private readonly client: HttpClient) {}

  listTasks(options?: ContractRequestOptions): Promise<readonly ContractReviewTask[]> {
    return this.client.request("/contract-review/tasks", {
      signal: options?.signal,
      decode: decodeContractReviewTaskArray,
    });
  }

  async getTask(
    taskId: string,
    options?: ContractRequestOptions,
  ): Promise<ContractReviewTask | undefined> {
    const task = await this.client.request(
      `/contract-review/tasks/${encodeURIComponent(taskId)}`,
      {
        signal: options?.signal,
        decode: nullable(decodeContractReviewTask),
      },
    );
    return task ?? undefined;
  }

  getEditorSession(taskId: string, options?: ContractRequestOptions) {
    return this.client.request(
      `/contract-review/tasks/${encodeURIComponent(taskId)}/editor-session`,
      { signal: options?.signal, decode: decodeContractEditorSession },
    );
  }

  finalizeEditor(taskId: string, options: ContractMutationOptions) {
    return this.client.request(
      `/contract-review/tasks/${encodeURIComponent(taskId)}/editor-finalize`,
      {
        method: "POST",
        ...mutationOptions(options),
        decode: decodeContractEditorFinalizeResult,
      },
    );
  }

  async createTask(
    input: CreateContractReviewTaskCommand,
    options: ContractMutationOptions,
  ) {
    const file = await uploadFileToObjectStorage(this.client, input.file, {
      idempotencyKey: `${options.idempotencyKey}:file`,
      signal: options.signal,
    });
    return this.client.request("/contract-review/tasks", {
      method: "POST",
      body: {
        fileId: file.id,
        name: input.name,
        stance: input.stance,
        modules: input.modules,
      },
      idempotencyKey: options.idempotencyKey,
      signal: options.signal,
      decode: decodeContractReviewTask,
    });
  }

  startReview(taskId: string, options: ContractMutationOptions) {
    return this.client.request(
      `/contract-review/tasks/${encodeURIComponent(taskId)}/start`,
      {
        method: "POST",
        headers: versionHeaders(options.expectedVersion),
        ...mutationOptions(options),
        decode: decodeContractReviewTask,
      },
    );
  }

  generateReport(taskId: string, options: ContractMutationOptions) {
    return this.client.request(
      `/contract-review/tasks/${encodeURIComponent(taskId)}/report`,
      {
        method: "POST",
        headers: versionHeaders(options.expectedVersion),
        ...mutationOptions(options),
        decode: decodeContractReviewTask,
      },
    );
  }

  updateRisk(
    taskId: string,
    riskId: string,
    command: { readonly state: ContractRiskState; readonly reason?: string },
    options: ContractMutationOptions,
  ) {
    return this.client.request(
      `/contract-review/tasks/${encodeURIComponent(taskId)}/risks/${encodeURIComponent(riskId)}`,
      {
        method: "PATCH",
        body: command,
        headers: versionHeaders(options.expectedVersion),
        ...mutationOptions(options),
        decode: decodeContractReviewTask,
      },
    );
  }

  storeTask(taskId: string, options: ContractMutationOptions) {
    return this.client.request(
      `/contract-review/tasks/${encodeURIComponent(taskId)}/store`,
      {
        method: "POST",
        headers: versionHeaders(options.expectedVersion),
        ...mutationOptions(options),
        decode: decodeContractReviewTask,
      },
    );
  }
}

export class ChatHttpAdapter implements ChatApi {
  constructor(private readonly client: HttpClient) {}

  listConversations(): Promise<readonly ChatConversation[]> {
    return this.client.request("/chat/conversations", {
      decode: decodeChatConversationArray,
    });
  }

  getConversation(id: string): Promise<ChatConversation | undefined> {
    return this.client.request(`/chat/conversations/${encodeURIComponent(id)}`, {
      decode: (value) =>
        value === null ? undefined : decodeChatConversation(value),
    });
  }

  createConversation(
    title: string | undefined,
    options: MutationOptions,
  ): Promise<ChatConversation> {
    return this.client.request("/chat/conversations", {
      method: "POST",
      body: { title: title?.trim() || undefined },
      ...mutationOptions(options),
      decode: decodeChatConversation,
    });
  }

  deleteConversation(id: string, options: MutationOptions): Promise<void> {
    return this.client.request(
      `/chat/conversations/${encodeURIComponent(id)}`,
      { method: "DELETE", ...mutationOptions(options) },
    );
  }

  sendMessage(
    conversationId: string,
    question: string,
    options: MutationOptions,
  ): Promise<ChatMessage> {
    return this.client.request(
      `/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        body: { question },
        ...mutationOptions(options),
        decode: decodeChatMessageResult,
      },
    );
  }
}

export type CreateHttpAppServicesOptions = HttpClientOptions;

export function createHttpAppServices(
  options: CreateHttpAppServicesOptions = {},
): AppServices {
  const client = new HttpClient(options);
  return Object.freeze({
    auth: new AuthHttpAdapter(client),
    dashboard: new DashboardHttpAdapter(client),
    classification: new ClassificationWorkflowHttpAdapter(client),
    classificationTasks: new ClassificationTaskPoolHttpAdapter(client),
    reviewTasks: new ReviewTaskPoolHttpAdapter(client),
    contractReview: new ContractReviewHttpAdapter(client),
    documents: new DocumentRepositoryHttpAdapter(client),
    knowledge: new KnowledgeHttpAdapter(client),
    chat: new ChatHttpAdapter(client),
  });
}
