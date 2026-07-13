import type {
  DocumentId,
  DocumentLevelCode,
  ReviewTaskId,
  DocumentStateKind,
  DocumentSummary,
  DocumentTypeCode,
} from "../domain";

export const documentCollections = [
  "classification",
  "review",
  "knowledge",
] as const;
export type DocumentCollection = (typeof documentCollections)[number];

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pageCount: number;
}

export interface DocumentQuery {
  readonly collection: DocumentCollection;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly types?: readonly DocumentTypeCode[];
  readonly levels?: readonly DocumentLevelCode[];
  readonly states?: readonly DocumentStateKind[];
  readonly sort?: {
    readonly by: "name" | "updatedAt";
    readonly direction: "asc" | "desc";
  };
}

export interface RepositoryRequestOptions {
  readonly signal?: AbortSignal;
}

export interface DocumentRepository {
  list(
    query: DocumentQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<DocumentSummary>>;

  getById(
    id: DocumentId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentSummary | null>;

  getByReviewTaskId(
    taskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentSummary | null>;
}
