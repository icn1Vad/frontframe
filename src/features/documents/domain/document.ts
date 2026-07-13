declare const documentIdBrand: unique symbol;
declare const reviewTaskIdBrand: unique symbol;
declare const reviewProgressBrand: unique symbol;
declare const userIdBrand: unique symbol;
declare const isoDateTimeBrand: unique symbol;

export type DocumentId = string & { readonly [documentIdBrand]: true };
export type ReviewTaskId = string & { readonly [reviewTaskIdBrand]: true };
export type ReviewProgress = number & { readonly [reviewProgressBrand]: true };
export type UserId = string & { readonly [userIdBrand]: true };
export type IsoDateTime = string & { readonly [isoDateTimeBrand]: true };

export const documentTypeCodes = [
  "policy",
  "contract",
  "report",
  "other",
] as const;
export type DocumentTypeCode = (typeof documentTypeCodes)[number];

export const documentLevelCodes = [
  "company",
  "department",
  "external-standard",
] as const;
export type DocumentLevelCode = (typeof documentLevelCodes)[number];

export const documentCategoryCodes = [
  "procurement",
  "contract",
  "supply-chain",
  "administration",
  "external-standard",
] as const;
export type DocumentCategoryCode = (typeof documentCategoryCodes)[number];

export type DocumentState =
  | {
      readonly kind: "pending";
      readonly queuedAt: IsoDateTime;
    }
  | {
      readonly kind: "classified";
      readonly classifiedAt: IsoDateTime;
    }
  | {
      readonly kind: "reviewing";
      readonly reviewTaskId: ReviewTaskId;
      readonly startedAt: IsoDateTime;
      readonly progress: ReviewProgress;
    }
  | {
      readonly kind: "reviewed";
      readonly reviewTaskId: ReviewTaskId;
      readonly reviewedAt: IsoDateTime;
    }
  | {
      readonly kind: "published";
      readonly publishedAt: IsoDateTime;
      readonly source: "classification";
    }
  | {
      readonly kind: "published";
      readonly publishedAt: IsoDateTime;
      readonly source: "review";
      readonly reviewTaskId: ReviewTaskId;
    }
  | {
      readonly kind: "deleted";
      readonly deletedAt: IsoDateTime;
    };

export type DocumentStateKind = DocumentState["kind"];

export interface UserSummary {
  readonly id: UserId;
  readonly displayName: string;
}

export interface DocumentSummary {
  readonly id: DocumentId;
  readonly name: string;
  readonly type: DocumentTypeCode;
  readonly level: DocumentLevelCode;
  readonly category: DocumentCategoryCode;
  readonly state: DocumentState;
  readonly operator: UserSummary;
}

export function createDocumentId(value: string): DocumentId {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Document id cannot be empty.");
  }
  return normalized as DocumentId;
}

export function createUserId(value: string): UserId {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("User id cannot be empty.");
  }
  return normalized as UserId;
}

export function createReviewTaskId(value: string): ReviewTaskId {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Review task id cannot be empty.");
  }
  return normalized as ReviewTaskId;
}

export function createReviewProgress(value: number): ReviewProgress {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Review progress must be between 0 and 100; received ${value}.`);
  }
  return value as ReviewProgress;
}

export function createIsoDateTime(value: string): IsoDateTime {
  const isoDateTimePattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!isoDateTimePattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`Invalid ISO date-time: ${value}`);
  }
  return value as IsoDateTime;
}

export function getDocumentStateTimestamp(state: DocumentState): IsoDateTime {
  switch (state.kind) {
    case "pending":
      return state.queuedAt;
    case "classified":
      return state.classifiedAt;
    case "reviewing":
      return state.startedAt;
    case "reviewed":
      return state.reviewedAt;
    case "published":
      return state.publishedAt;
    case "deleted":
      return state.deletedAt;
  }
}

export function getDocumentReviewTaskId(
  state: DocumentState,
): ReviewTaskId | undefined {
  switch (state.kind) {
    case "reviewing":
    case "reviewed":
      return state.reviewTaskId;
    case "published":
      return state.source === "review" ? state.reviewTaskId : undefined;
    case "pending":
    case "classified":
    case "deleted":
      return undefined;
  }
}
