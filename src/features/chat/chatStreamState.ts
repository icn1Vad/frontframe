import type { ChatCitation, ChatStreamMeta } from "../../app/services";

export interface ChatStreamRequest {
  readonly conversationId: string;
  readonly question: string;
  readonly idempotencyKey: string;
}

export type ChatStreamPhase =
  | "connecting"
  | "generating"
  | "recovering"
  | "completed"
  | "failed";

export interface ActiveChatStream {
  readonly request: ChatStreamRequest;
  readonly phase: ChatStreamPhase;
  readonly content: string;
  readonly citations: readonly ChatCitation[];
  readonly processExpanded: boolean;
  readonly connected: boolean;
  readonly resumed: boolean;
  readonly autoRecoveryUsed: boolean;
  readonly meta?: ChatStreamMeta;
  readonly errorMessage?: string;
  readonly retryable: boolean;
}

export type ChatStreamAction =
  | { readonly type: "meta"; readonly meta: ChatStreamMeta }
  | { readonly type: "snapshot"; readonly content: string }
  | { readonly type: "delta"; readonly content: string }
  | { readonly type: "citation"; readonly citation: ChatCitation }
  | { readonly type: "recover"; readonly automatic: boolean }
  | { readonly type: "complete" }
  | {
      readonly type: "fail";
      readonly message: string;
      readonly retryable: boolean;
    }
  | { readonly type: "toggle-process" };

export function citationKey(citation: ChatCitation): string {
  return [
    citation.documentId,
    citation.documentName,
    citation.location,
    citation.excerpt,
  ].map((value) => value?.trim() ?? "").join("\u001f");
}

export function createActiveChatStream(
  request: ChatStreamRequest,
): ActiveChatStream {
  return {
    request,
    phase: "connecting",
    content: "",
    citations: [],
    processExpanded: true,
    connected: false,
    resumed: false,
    autoRecoveryUsed: false,
    retryable: false,
  };
}

export function shouldAutoRecover(
  retryable: boolean,
  autoRecoveryUsed: boolean,
): boolean {
  return retryable && !autoRecoveryUsed;
}

export function areConversationControlsLocked(
  sending: boolean,
  pendingAction: string | null,
): boolean {
  return sending || pendingAction !== null;
}

export function chatStreamReducer(
  state: ActiveChatStream,
  action: ChatStreamAction,
): ActiveChatStream {
  switch (action.type) {
    case "meta":
      return {
        ...state,
        phase: action.meta.resumed ? "recovering" : "generating",
        connected: true,
        resumed: state.resumed || action.meta.resumed,
        meta: action.meta,
        errorMessage: undefined,
        retryable: false,
      };
    case "snapshot":
      return {
        ...state,
        phase: "recovering",
        content: action.content,
        processExpanded: false,
      };
    case "delta":
      return {
        ...state,
        phase: "generating",
        content: state.content + action.content,
        processExpanded: state.content ? state.processExpanded : false,
      };
    case "citation": {
      const key = citationKey(action.citation);
      if (state.citations.some((citation) => citationKey(citation) === key)) {
        return state;
      }
      return { ...state, citations: [...state.citations, action.citation] };
    }
    case "recover":
      return {
        ...state,
        phase: "recovering",
        connected: false,
        processExpanded: true,
        autoRecoveryUsed: state.autoRecoveryUsed || action.automatic,
        errorMessage: undefined,
        retryable: false,
      };
    case "complete":
      return {
        ...state,
        phase: "completed",
        connected: true,
        processExpanded: false,
        errorMessage: undefined,
        retryable: false,
      };
    case "fail":
      return {
        ...state,
        phase: "failed",
        processExpanded: true,
        errorMessage: action.message,
        retryable: action.retryable,
      };
    case "toggle-process":
      return { ...state, processExpanded: !state.processExpanded };
  }
}
