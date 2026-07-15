export interface ContractDocumentAnchor {
  readonly documentId: string;
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

export interface WpsContractEditorSession {
  readonly provider: "wps";
  readonly sdkUrl: string;
  readonly appId: string;
  readonly fileId: string;
  readonly token?: string | WpsTokenData;
  readonly refreshTokenUrl?: string;
  readonly endpoint?: string;
  readonly mode?: "normal" | "simple";
  readonly customArgs?: Readonly<Record<string, string | number | boolean>>;
}

export type ContractEditorSession =
  | MockContractEditorSession
  | WpsContractEditorSession;

export function isContractEditorSession(
  value: unknown,
): value is ContractEditorSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ContractEditorSession>;
  if (candidate.provider === "mock") return typeof candidate.reason === "string";
  if (candidate.provider !== "wps") return false;
  return (
    typeof candidate.sdkUrl === "string" &&
    typeof candidate.appId === "string" &&
    typeof candidate.fileId === "string"
  );
}
