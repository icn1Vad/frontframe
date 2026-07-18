import type {
  ChatApi,
  ChatCitation,
  ChatConversation,
  ChatMessage,
  ChatStreamContent,
  ChatStreamHandlers,
  ChatStreamMeta,
} from "../../app/services";
import { ChatStreamError } from "../../features/chat/ChatStreamError";
import type { MutationOptions } from "../../features/documents/application";
import { HttpClient } from "./HttpClient";

interface ConversationDto {
  readonly conversationId: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CitationDto {
  readonly sourceId: string | null;
  readonly sourceName: string | null;
  readonly location?: string | null;
  readonly excerpt: string | null;
}

interface MessageDto {
  readonly messageId: string;
  readonly role: "USER" | "ASSISTANT";
  readonly content: string;
  readonly citations: readonly CitationDto[];
  readonly createdAt: string;
}

interface PageDto<T> {
  readonly list: readonly T[];
  readonly total: number;
}

interface SseEvent {
  readonly event: string;
  readonly data: string;
}

interface DoneEvent {
  readonly messageId: string;
  readonly sequence: number;
  readonly resumed: boolean;
}

interface ErrorEvent {
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly retryable: boolean;
}

export const CHAT_STREAM_TIMEOUT_MS = 180_000;

function mapCitation(citation: CitationDto): ChatCitation {
  return {
    documentId: citation.sourceId,
    documentName: citation.sourceName,
    location: citation.location,
    excerpt: citation.excerpt,
  };
}

function mapMessage(message: MessageDto): ChatMessage {
  return {
    id: message.messageId,
    role: message.role === "USER" ? "user" : "assistant",
    content: message.content,
    createdAt: message.createdAt,
    citations: message.citations.map(mapCitation),
  };
}

function mapConversation(
  conversation: ConversationDto,
  messages: readonly ChatMessage[] = [],
): ChatConversation {
  return {
    id: conversation.conversationId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages,
  };
}

function parseBlock(block: string): SseEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

async function consumeSse(
  response: Response,
  onEvent: (event: SseEvent) => "continue" | "stop",
): Promise<void> {
  if (!response.body) throw new Error("服务器未返回流式响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamEnded = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const parsed = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (parsed && onEvent(parsed) === "stop") return;
        boundary = buffer.indexOf("\n\n");
      }
      if (done) {
        streamEnded = true;
        break;
      }
    }
    const trailing = parseBlock(buffer.trim());
    if (trailing) onEvent(trailing);
  } finally {
    if (!streamEnded) await reader.cancel().catch(() => undefined);
  }
}

function parseJson<T>(value: string, event: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new ChatStreamError(
      `无法解析 SSE ${event} 事件`,
      false,
      "CHAT_STREAM_PROTOCOL_ERROR",
    );
  }
}

function isRetryableHttpStatus(status: number): boolean {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function citationFingerprint(citation: ChatCitation): string {
  return [
    citation.documentId,
    citation.documentName,
    citation.location,
    citation.excerpt,
  ].map((value) => value?.trim() ?? "").join("\u001f");
}

export class BusinessChatApi implements ChatApi {
  private readonly conversations = new Map<string, ConversationDto>();

  constructor(
    private readonly getAccessToken: () => string | undefined,
    private readonly onUnauthorized: () => void,
    private readonly client: HttpClient,
  ) {}

  private requireAccessToken(): string {
    const token = this.getAccessToken();
    if (token) return token;
    this.onUnauthorized();
    throw new Error("登录状态已失效，请重新登录");
  }

  async listConversations(): Promise<readonly ChatConversation[]> {
    this.requireAccessToken();
    const data = await this.client.request<PageDto<ConversationDto>>(
      "/business/chat/conversations",
      { query: { page: 1, size: 100 } },
    );
    data.list.forEach((conversation) => this.conversations.set(conversation.conversationId, conversation));
    return data.list.map((conversation) => mapConversation(conversation));
  }

  async getConversation(id: string): Promise<ChatConversation | undefined> {
    let conversation = this.conversations.get(id);
    if (!conversation) {
      await this.listConversations();
      conversation = this.conversations.get(id);
    }
    if (!conversation) return undefined;
    const messages = await this.client.request<readonly MessageDto[]>(
      `/business/chat/conversations/${encodeURIComponent(id)}/messages`,
    );
    return mapConversation(conversation, messages.map(mapMessage));
  }

  async createConversation(
    title: string | undefined,
    options: MutationOptions,
  ): Promise<ChatConversation> {
    this.requireAccessToken();
    const conversation = await this.client.request<ConversationDto>(
      "/business/chat/conversations",
      {
        method: "POST",
        body: { title: title?.trim() || "新建提问集" },
        idempotencyKey: options.idempotencyKey,
        signal: options.signal,
      },
    );
    this.conversations.set(conversation.conversationId, conversation);
    return mapConversation(conversation);
  }

  async deleteConversation(id: string, options: MutationOptions): Promise<void> {
    this.requireAccessToken();
    await this.client.request<void>(
      `/business/chat/conversations/${encodeURIComponent(id)}`,
      { method: "DELETE", signal: options.signal },
    );
    this.conversations.delete(id);
  }

  async sendMessage(
    conversationId: string,
    question: string,
    options: MutationOptions & ChatStreamHandlers,
  ): Promise<ChatMessage> {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) throw new Error("问题内容不能为空");
    if (normalizedQuestion.length > 4000) throw new Error("问题最多 4000 个字符");
    const token = this.requireAccessToken();
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CHAT_STREAM_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abortFromCaller();
    else options.signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await fetch(
        `/api/continew/business/chat/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
        {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": options.idempotencyKey,
          },
          body: JSON.stringify({ content: normalizedQuestion }),
        },
      );
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("text/event-stream")) {
        const payload = await response.json().catch(() => null) as {
          readonly code?: string;
          readonly msg?: string;
        } | null;
        if (response.status === 401 || payload?.code === "401") this.onUnauthorized();
        throw new ChatStreamError(
          payload?.msg || `流式问答请求失败（${response.status}）`,
          response.ok ? false : isRetryableHttpStatus(response.status),
          payload?.code || `HTTP_${response.status}`,
        );
      }

      let messageId = `stream-${Date.now()}`;
      let content = "";
      const citations: ChatCitation[] = [];
      const citationKeys = new Set<string>();
      let lastContentSequence = -1;
      let finished = false;

      await consumeSse(response, ({ event, data }) => {
        if (event === "meta") {
          const meta = parseJson<ChatStreamMeta>(data, event);
          messageId = meta.messageId;
          options.onMeta?.(meta);
          return "continue";
        }
        if (event === "snapshot") {
          const snapshot = parseJson<ChatStreamContent>(data, event);
          if (snapshot.sequence < lastContentSequence) return "continue";
          lastContentSequence = snapshot.sequence;
          content = snapshot.content;
          options.onSnapshot?.(snapshot);
          return "continue";
        }
        if (event === "delta") {
          const delta = parseJson<ChatStreamContent>(data, event);
          if (delta.sequence <= lastContentSequence) return "continue";
          lastContentSequence = delta.sequence;
          content += delta.content;
          options.onDelta?.(delta);
          return "continue";
        }
        if (event === "citation") {
          const citation = mapCitation(
            parseJson<{ citation: CitationDto }>(data, event).citation,
          );
          const key = citationFingerprint(citation);
          if (!citationKeys.has(key)) {
            citationKeys.add(key);
            citations.push(citation);
            options.onCitation?.(citation);
          }
          return "continue";
        }
        if (event === "done") {
          messageId = parseJson<DoneEvent>(data, event).messageId;
          finished = true;
          return "stop";
        }
        if (event === "error") {
          const streamError = parseJson<ErrorEvent>(data, event);
          throw new ChatStreamError(
            streamError.errorMessage,
            streamError.retryable,
            streamError.errorCode,
          );
        }
        return "continue";
      });

      if (!finished) {
        throw new ChatStreamError(
          "流式回答在 done 事件前中断",
          true,
          "CHAT_STREAM_INTERRUPTED",
        );
      }
      return {
        id: messageId,
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
        citations,
      };
    } catch (error) {
      if (error instanceof ChatStreamError) throw error;
      if (timedOut) {
        throw new ChatStreamError(
          "回答等待超过 180 秒",
          true,
          "CHAT_STREAM_TIMEOUT",
        );
      }
      if (options.signal?.aborted) {
        throw new ChatStreamError(
          "流式问答已取消",
          false,
          "CHAT_STREAM_CANCELLED",
        );
      }
      throw new ChatStreamError(
        error instanceof Error && error.name !== "AbortError"
          ? error.message
          : "流式回答连接中断",
        true,
        "CHAT_STREAM_INTERRUPTED",
      );
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}
