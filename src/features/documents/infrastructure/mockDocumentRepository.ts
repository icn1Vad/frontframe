import type {
  DocumentCollection,
  DocumentQuery,
  DocumentRepository,
  PageResult,
  RepositoryRequestOptions,
} from "../application";
import {
  createDocumentId,
  createIsoDateTime,
  createReviewTaskId,
  createReviewProgress,
  createUserId,
  getDocumentReviewTaskId,
  getDocumentStateTimestamp,
  type DocumentId,
  type DocumentSummary,
  type ReviewTaskId,
} from "../domain";

const documentStorageKey = "proofspace.documents.v3";
const legacyDocumentStorageKey = "proofspace.documents.v2";

const operatorZhang = {
  id: createUserId("user_zhang_san"),
  displayName: "张三",
} as const;

const operatorLi = {
  id: createUserId("user_li_si"),
  displayName: "李四",
} as const;

const classifiedContract = {
  id: createDocumentId("doc_xx_project_contract_v1"),
  name: "星河项目服务合同.pdf",
  type: "contract",
  level: "department",
  category: "contract",
  state: {
    kind: "published",
    source: "classification",
    publishedAt: createIsoDateTime("2026-07-05T10:30:00+08:00"),
  },
  operator: operatorZhang,
} as const satisfies DocumentSummary;

const reviewedPurchasePolicy = {
  id: createDocumentId("doc_purchase_policy_approved_v1"),
  name: "采购管理办法.docx",
  type: "policy",
  level: "company",
  category: "procurement",
  state: {
    kind: "published",
    source: "review",
    reviewTaskId: createReviewTaskId("review_purchase_policy_approved_v1"),
    publishedAt: createIsoDateTime("2026-07-05T14:40:00+08:00"),
  },
  operator: operatorZhang,
} as const satisfies DocumentSummary;

const classifiedRegulations = {
  id: createDocumentId("doc_regulations_collection_v1"),
  name: "法律法规汇编.pdf",
  type: "other",
  level: "external-standard",
  category: "external-standard",
  state: {
    kind: "published",
    source: "classification",
    publishedAt: createIsoDateTime("2026-07-04T10:18:00+08:00"),
  },
  operator: operatorZhang,
} as const satisfies DocumentSummary;

export const mockDocumentCollections = {
  classification: [
    {
      id: createDocumentId("doc_purchase_policy_draft_2026"),
      name: "采购管理办法.docx",
      type: "policy",
      level: "company",
      category: "procurement",
      state: {
        kind: "pending",
        queuedAt: createIsoDateTime("2026-07-05T10:24:00+08:00"),
      },
      operator: operatorZhang,
    },
    classifiedContract,
    {
      id: createDocumentId("doc_supplier_statement_v1"),
      name: "供应商说明.pdf",
      type: "report",
      level: "company",
      category: "supply-chain",
      state: {
        kind: "reviewing",
        reviewTaskId: createReviewTaskId("review_supplier_statement_v1"),
        startedAt: createIsoDateTime("2026-07-05T10:41:00+08:00"),
        progress: createReviewProgress(0),
      },
      operator: operatorZhang,
    },
    {
      id: createDocumentId("doc_legacy_policy_v1"),
      name: "旧版制度.docx",
      type: "policy",
      level: "company",
      category: "administration",
      state: {
        kind: "deleted",
        deletedAt: createIsoDateTime("2026-07-04T15:08:00+08:00"),
        previousKind: "pending",
        reason: "user-action",
      },
      operator: operatorLi,
    },
    classifiedRegulations,
  ],
  review: [
    {
      id: createDocumentId("doc_purchase_policy_review_v1"),
      name: "采购管理办法.docx",
      type: "policy",
      level: "company",
      category: "procurement",
      state: {
        kind: "reviewing",
        reviewTaskId: createReviewTaskId("review_purchase_policy_v1"),
        startedAt: createIsoDateTime("2026-07-05T11:38:00+08:00"),
        progress: createReviewProgress(30),
      },
      operator: operatorZhang,
    },
    {
      id: createDocumentId("doc_supplier_policy_v1"),
      name: "供应商管理制度.docx",
      type: "policy",
      level: "company",
      category: "supply-chain",
      state: {
        kind: "reviewed",
        reviewTaskId: createReviewTaskId("review_supplier_policy_v1"),
        reviewedAt: createIsoDateTime("2026-07-05T12:08:00+08:00"),
      },
      operator: operatorZhang,
    },
    {
      id: createDocumentId("doc_xx_project_contract_review_v2"),
      name: "星河项目服务合同.pdf",
      type: "contract",
      level: "department",
      category: "contract",
      state: {
        kind: "published",
        source: "review",
        reviewTaskId: createReviewTaskId("review_xx_project_contract_v2"),
        publishedAt: createIsoDateTime("2026-07-04T18:20:00+08:00"),
      },
      operator: operatorZhang,
    },
    {
      id: createDocumentId("doc_legacy_policy_review_v2"),
      name: "旧版制度.docx",
      type: "policy",
      level: "company",
      category: "administration",
      state: {
        kind: "deleted",
        deletedAt: createIsoDateTime("2026-07-04T15:08:00+08:00"),
        previousKind: "reviewed",
        reviewTaskId: createReviewTaskId("review_legacy_policy_v2"),
        reason: "user-action",
      },
      operator: operatorZhang,
    },
    reviewedPurchasePolicy,
  ],
  knowledge: [
    reviewedPurchasePolicy,
    classifiedContract,
    classifiedRegulations,
  ],
} as const satisfies Record<DocumentCollection, readonly DocumentSummary[]>;

function cloneCollections(
  collections: Record<DocumentCollection, readonly DocumentSummary[]>,
): Record<DocumentCollection, DocumentSummary[]> {
  return {
    classification: collections.classification.map((document) => ({ ...document })),
    review: collections.review.map((document) => ({ ...document })),
    knowledge: collections.knowledge.map((document) => ({ ...document })),
  };
}

function readStoredCollections():
  | Record<DocumentCollection, DocumentSummary[]>
  | undefined {
  if (typeof window === "undefined") return undefined;
  window.localStorage.removeItem(legacyDocumentStorageKey);
  const stored = window.localStorage.getItem(documentStorageKey);
  if (!stored) return undefined;
  try {
    const parsed = JSON.parse(stored) as Partial<
      Record<DocumentCollection, DocumentSummary[]>
    >;
    if (
      Array.isArray(parsed.classification) &&
      Array.isArray(parsed.review) &&
      Array.isArray(parsed.knowledge)
    ) {
      return {
        classification: parsed.classification,
        review: parsed.review,
        knowledge: parsed.knowledge,
      };
    }
  } catch {
    window.localStorage.removeItem(documentStorageKey);
  }
  return undefined;
}

function throwIfAborted(options?: RepositoryRequestOptions) {
  options?.signal?.throwIfAborted();
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function matchesQuery(document: DocumentSummary, query: DocumentQuery): boolean {
  if (query.search) {
    const search = normalize(query.search);
    const searchable = [
      document.name,
      document.type,
      document.level,
      document.category,
      document.state.kind,
      document.operator.displayName,
    ]
      .map(normalize)
      .join(" ");
    if (!searchable.includes(search)) return false;
  }

  if (query.types?.length && !query.types.includes(document.type)) return false;
  if (query.levels?.length && !query.levels.includes(document.level)) return false;
  if (query.states?.length && !query.states.includes(document.state.kind)) return false;
  return true;
}

function compareDocuments(
  left: DocumentSummary,
  right: DocumentSummary,
  query: DocumentQuery,
): number {
  if (!query.sort) return 0;
  const direction = query.sort.direction === "asc" ? 1 : -1;
  const comparison = query.sort.by === "name"
    ? left.name.localeCompare(right.name, "zh-CN")
    : getDocumentStateTimestamp(left.state).localeCompare(
        getDocumentStateTimestamp(right.state),
      );
  return comparison * direction;
}

export class MockDocumentRepository implements DocumentRepository {
  private readonly collections: Record<DocumentCollection, DocumentSummary[]>;

  constructor(
    collections: Record<DocumentCollection, readonly DocumentSummary[]> =
      mockDocumentCollections,
  ) {
    this.collections = readStoredCollections() ?? cloneCollections(collections);
  }

  getFromCollection(
    collection: DocumentCollection,
    id: DocumentId,
  ): DocumentSummary | null {
    return this.collections[collection].find((document) => document.id === id) ?? null;
  }

  upsert(
    collection: DocumentCollection,
    document: DocumentSummary,
  ): DocumentSummary {
    const index = this.collections[collection].findIndex(
      (candidate) => candidate.id === document.id,
    );
    if (index === -1) this.collections[collection].push(document);
    else this.collections[collection][index] = document;
    this.persist();
    return document;
  }

  remove(collection: DocumentCollection, id: DocumentId): DocumentSummary | null {
    const index = this.collections[collection].findIndex(
      (document) => document.id === id,
    );
    if (index === -1) return null;
    const [removed] = this.collections[collection].splice(index, 1);
    this.persist();
    return removed ?? null;
  }

  async list(
    query: DocumentQuery,
    options?: RepositoryRequestOptions,
  ): Promise<PageResult<DocumentSummary>> {
    throwIfAborted(options);
    await Promise.resolve();
    throwIfAborted(options);

    const page = positiveInteger(query.page, 1);
    const pageSize = positiveInteger(query.pageSize, 20);
    const filtered = this.collections[query.collection]
      .filter((document) => matchesQuery(document, query))
      .slice()
      .sort((left, right) => compareDocuments(left, right, query));
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

  async getById(
    id: DocumentId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentSummary | null> {
    throwIfAborted(options);
    await Promise.resolve();
    throwIfAborted(options);

    for (const collection of Object.values(this.collections)) {
      const match = collection.find((document) => document.id === id);
      if (match) return match;
    }
    return null;
  }

  async getByReviewTaskId(
    taskId: ReviewTaskId,
    options?: RepositoryRequestOptions,
  ): Promise<DocumentSummary | null> {
    throwIfAborted(options);
    await Promise.resolve();
    throwIfAborted(options);

    for (const collection of Object.values(this.collections)) {
      const match = collection.find(
        (document) => getDocumentReviewTaskId(document.state) === taskId,
      );
      if (match) return match;
    }
    return null;
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      documentStorageKey,
      JSON.stringify(this.collections),
    );
  }
}

const emptyDocumentCollections: Record<
  DocumentCollection,
  readonly DocumentSummary[]
> = {
  classification: [],
  review: [],
  knowledge: [],
};

export const mockDocumentRepository = new MockDocumentRepository(
  emptyDocumentCollections,
);
