import type {
  ClassificationCandidateId,
  DocumentCategoryCode,
  DocumentId,
  DocumentLevelCode,
  DocumentSummary,
  DocumentTypeCode,
  ReviewTaskId,
} from "../domain";
import type {
  DocumentQuery,
  PageResult,
  RepositoryRequestOptions,
} from "./DocumentRepository";

export type ClassificationCandidateState =
  | "classifying"
  | "awaiting-confirmation";

export interface ClassificationCandidateRecord {
  readonly id: ClassificationCandidateId;
  readonly name: string;
  readonly type: DocumentTypeCode;
  readonly level: DocumentLevelCode;
  readonly category: DocumentCategoryCode;
  readonly state: ClassificationCandidateState;
  readonly version: number;
}

export interface ClassificationCandidateStats {
  readonly total: number;
  readonly classifying: number;
  readonly awaitingConfirmation: number;
}

export interface ClassificationCandidateQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly types?: readonly DocumentTypeCode[];
  readonly levels?: readonly DocumentLevelCode[];
  readonly categories?: readonly DocumentCategoryCode[];
  readonly states?: readonly ClassificationCandidateState[];
}

export interface ConfirmCandidateInput {
  readonly id: ClassificationCandidateId;
  readonly name: string;
  readonly type: DocumentTypeCode;
  readonly level: DocumentLevelCode;
  readonly category: DocumentCategoryCode;
  readonly expectedVersion: number;
  readonly manualOverride: boolean;
}

export interface ConfirmedCandidateResult {
  readonly candidateId: ClassificationCandidateId;
  readonly document: DocumentSummary;
}

export interface VersionedCandidateInput {
  readonly id: ClassificationCandidateId;
  readonly expectedVersion: number;
}

export interface BatchMutationFailure {
  readonly id: string;
  readonly code: "not-found" | "validation" | "conflict" | "unavailable";
  readonly message: string;
}

export interface BatchMutationResult<T> {
  readonly succeeded: readonly T[];
  readonly failed: readonly BatchMutationFailure[];
}

export interface MutationOptions extends RepositoryRequestOptions {
  readonly idempotencyKey: string;
}

export interface DocumentPreview {
  readonly documentName: string;
  readonly content: string;
}

export interface KnowledgeGraph {
  readonly nodes: readonly {
    readonly id: string;
    readonly label: string;
  }[];
  readonly edges: readonly {
    readonly source: string;
    readonly target: string;
    readonly relation: string;
  }[];
}

export interface ClassificationWorkflowApi {
  getStats(
    options?: RepositoryRequestOptions,
  ): Promise<ClassificationCandidateStats>;
  listCandidates(
    query: ClassificationCandidateQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<ClassificationCandidateRecord>>;
  uploadFiles(
    files: readonly File[],
    options: MutationOptions,
  ): Promise<readonly ClassificationCandidateRecord[]>;
  confirmUpload(
    candidateIds: readonly ClassificationCandidateId[],
    options: MutationOptions,
  ): Promise<readonly ClassificationCandidateRecord[]>;
  getPreview(
    candidateId: ClassificationCandidateId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentPreview | null>;
  confirmCandidates(
    candidates: readonly ConfirmCandidateInput[],
    options: MutationOptions,
  ): Promise<BatchMutationResult<ConfirmedCandidateResult>>;
  softDeleteCandidates(
    candidates: readonly VersionedCandidateInput[],
    options: MutationOptions,
  ): Promise<BatchMutationResult<ClassificationCandidateRecord>>;
}

export type TaskPoolQuery = Omit<DocumentQuery, "collection">;

export interface ClassificationTaskPoolApi {
  list(
    query: TaskPoolQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<DocumentSummary>>;
  getPreview(
    documentId: DocumentId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentPreview | null>;
  publish(
    documentId: DocumentId,
    options: MutationOptions,
  ): Promise<DocumentSummary>;
  startReview(
    documentId: DocumentId,
    options: MutationOptions,
  ): Promise<DocumentSummary>;
  softDelete(
    documentId: DocumentId,
    options: MutationOptions,
  ): Promise<DocumentSummary>;
}

export interface ReviewTaskPoolApi {
  list(
    query: TaskPoolQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<DocumentSummary>>;
  getProgress(
    reviewTaskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<number>;
  getReport(
    reviewTaskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentPreview | null>;
  createTerminationReport(
    reviewTaskId: ReviewTaskId,
    options: MutationOptions,
  ): Promise<DocumentPreview>;
  ignoreAllRisks(
    reviewTaskId: ReviewTaskId,
    options: MutationOptions,
  ): Promise<void>;
  publish(
    documentId: DocumentId,
    options: MutationOptions,
  ): Promise<DocumentSummary>;
  softDelete(
    documentId: DocumentId,
    options: MutationOptions,
  ): Promise<DocumentSummary>;
}

export interface KnowledgeApi {
  list(
    query: TaskPoolQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<DocumentSummary>>;
  getPreview(
    documentId: DocumentId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentPreview | null>;
  getReport(
    documentId: DocumentId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentPreview | null>;
  getGraph(options?: RepositoryRequestOptions): Promise<KnowledgeGraph>;
  softDelete(
    documentId: DocumentId,
    options: MutationOptions,
  ): Promise<DocumentSummary>;
}
