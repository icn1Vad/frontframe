export interface ContractDocumentAnchor {
  readonly documentId: string;
  readonly documentVersionId: string;
  readonly sourceVersion: number;
  readonly quotedText: string;
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly occurrence?: number;
  readonly pageHint?: number;
}

export interface ContractDocumentRevision {
  readonly anchor: ContractDocumentAnchor;
  readonly replacementText: string;
  readonly expectedText?: string;
}

export interface MockContractEditorSession {
  readonly provider: "mock";
  readonly reason: string;
}

export interface WpsTokenData {
  readonly token: string;
  readonly timeout: number;
}

export interface ContractEditorUser {
  readonly id: string;
  readonly name: string;
  readonly permission: "read" | "write";
}

export interface WpsContractEditorSession {
  readonly provider: "wps";
  readonly sdkUrl: string;
  readonly appId: string;
  readonly fileId: string;
  readonly contractId: string;
  readonly taskId: string;
  readonly documentVersionId: string;
  readonly officeType: "writer";
  readonly readonly: boolean;
  readonly currentUser: ContractEditorUser;
  readonly token: string | WpsTokenData;
  readonly expiresAt: string;
  readonly refreshTokenUrl?: string;
  readonly endpoint?: string;
  readonly mode?: "normal" | "simple";
  readonly customArgs?: Readonly<Record<string, string | number | boolean>>;
}

export type ContractEditorSession =
  | MockContractEditorSession
  | WpsContractEditorSession;

export type WpsSaveStatus =
  | "ok"
  | "nochange"
  | "SavedEmptyFile"
  | "SpaceFull"
  | "QueneFull"
  | "fail";

export interface WpsSaveResult {
  readonly status: WpsSaveStatus;
  readonly size?: number;
  readonly version?: number;
}

export type WpsEditorErrorCode =
  | "sdk-load-failed"
  | "file-open-failed"
  | "file-not-found"
  | "token-expired"
  | "permission-denied"
  | "file-too-large"
  | "save-failed"
  | "storage-full"
  | "save-busy"
  | "empty-file"
  | "not-ready"
  | "source-changed"
  | "anchor-not-found";

export type WpsEditorEvent =
  | {
      readonly type: "file-opened";
      readonly fileId: string;
      readonly documentVersionId: string;
    }
  | {
      readonly type: "selection-changed";
      readonly begin?: number;
      readonly end?: number;
    }
  | { readonly type: "save-succeeded"; readonly result: WpsSaveResult }
  | {
      readonly type: "save-failed";
      readonly code: WpsEditorErrorCode;
      readonly message: string;
    }
  | {
      readonly type: "editor-error";
      readonly code: WpsEditorErrorCode;
      readonly message: string;
    };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isWpsToken(value: unknown): value is string | WpsTokenData {
  if (isNonEmptyString(value)) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WpsTokenData>;
  return isNonEmptyString(candidate.token) &&
    typeof candidate.timeout === "number" &&
    Number.isFinite(candidate.timeout) &&
    candidate.timeout > 0;
}

function isEditorUser(value: unknown): value is ContractEditorUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ContractEditorUser>;
  return isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.name) &&
    (candidate.permission === "read" || candidate.permission === "write");
}

export function isContractEditorSession(
  value: unknown,
): value is ContractEditorSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ContractEditorSession>;
  if (candidate.provider === "mock") return typeof candidate.reason === "string";
  if (candidate.provider !== "wps") return false;
  return (
    isNonEmptyString(candidate.sdkUrl) &&
    isNonEmptyString(candidate.appId) &&
    isNonEmptyString(candidate.fileId) &&
    isNonEmptyString(candidate.contractId) &&
    isNonEmptyString(candidate.taskId) &&
    isNonEmptyString(candidate.documentVersionId) &&
    candidate.officeType === "writer" &&
    typeof candidate.readonly === "boolean" &&
    isEditorUser(candidate.currentUser) &&
    isWpsToken(candidate.token) &&
    isNonEmptyString(candidate.expiresAt) &&
    Number.isFinite(Date.parse(candidate.expiresAt))
  );
}
