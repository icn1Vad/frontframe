import type {
  ChatApi,
  ChatCitation,
  ChatConversation,
  ChatMessage,
  ChatStreamHandlers,
} from "../../app/services";
import type { MutationOptions } from "../../features/documents/application";
import { HttpClient } from "./HttpClient";

interface ConversationDto {
  readonly conversationId: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CitationDto {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly location?: string;
  readonly excerpt: string;
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
  onEvent: (event: SseEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error("服务器未返回流式响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const parsed = parseBlock(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      if (parsed) onEvent(parsed);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
  const trailing = parseBlock(buffer.trim());
  if (trailing) onEvent(trailing);
}

function parseJson<T>(value: string, event: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`无法解析 SSE ${event} 事件`);
  }
}

export class BusinessChatApi implements ChatApi {
  constructor(
    private readonly getAccessToken: () => string | undefined,
    private readonly onUnauthorized: () => void,
    private readonly client: HttpClient,
  ) {}

  async listConversations(): Promise<readonly ChatConversation[]> {
    const data = await this.client.request<PageDto<ConversationDto>>(
      "/business/chat/conversations",
      { query: { page: 1, size: 100 } },
    );
    return data.list.map((conversation) => mapConversation(conversation));
  }

  async getConversation(id: string): Promise<ChatConversation | undefined> {
    const [conversation, messages] = await Promise.all([
      this.client.request<ConversationDto>(
        `/business/chat/conversations/${encodeURIComponent(id)}`,
      ),
      this.client.request<readonly MessageDto[]>(
        `/business/chat/conversations/${encodeURIComponent(id)}/messages`,
      ),
    ]);
    return mapConversation(conversation, messages.map(mapMessage));
  }

  async createConversation(
    title: string | undefined,
    options: MutationOptions,
  ): Promise<ChatConversation> {
    const conversation = await this.client.request<ConversationDto>(
      "/business/chat/conversations",
      {
        method: "POST",
        body: { title: title?.trim() || "新建提问集" },
        idempotencyKey: options.idempotencyKey,
        signal: options.signal,
      },
    );
    return mapConversation(conversation);
  }

  async deleteConversation(id: string, options: MutationOptions): Promise<void> {
    await this.client.request<void>(
      `/business/chat/conversations/${encodeURIComponent(id)}`,
      { method: "DELETE", signal: options.signal },
    );
  }

  async sendMessage(
    conversationId: string,
    question: string,
    options: MutationOptions & ChatStreamHandlers,
  ): Promise<ChatMessage> {
    const token = this.getAccessToken();
    if (!token) {
      this.onUnauthorized();
      throw new Error("登录状态已失效，请重新登录");
    }
    const response = await fetch(
      `/business/chat/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
      {
        method: "POST",
        credentials: "include",
        signal: options.signal,
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": options.idempotencyKey,
        },
        body: JSON.stringify({ content: question.trim() }),
      },
    );
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/event-stream")) {
      const payload = await response.json().catch(() => null) as {
        readonly code?: string;
        readonly msg?: string;
      } | null;
      if (response.status === 401 || payload?.code === "401") this.onUnauthorized();
      throw new Error(payload?.msg || `流式问答请求失败（${response.status}）`);
    }

    let messageId = `stream-${Date.now()}`;
    let content = "";
    const citations: ChatCitation[] = [];
    let finished = false;
    await consumeSse(response, ({ event, data }) => {
      if (event === "meta") {
        const meta = parseJson<{
          requestId: string;
          conversationId: string;
          messageId: string;
        }>(data, event);
        messageId = meta.messageId;
        options.onMeta?.(meta);
      } else if (event === "delta") {
        const delta = parseJson<{ content: string }>(data, event);
        content += delta.content;
        options.onDelta?.(delta.content);
      } else if (event === "citation") {
        const citation = mapCitation(
          parseJson<{ citation: CitationDto }>(data, event).citation,
        );
        citations.push(citation);
        options.onCitation?.(citation);
      } else if (event === "done") {
        messageId = parseJson<{ messageId: string }>(data, event).messageId;
        finished = true;
      } else if (event === "error") {
        const error = parseJson<{
          errorCode: string;
          errorMessage: string;
          retryable: boolean;
        }>(data, event);
        throw new Error(`${error.errorMessage}${error.retryable ? "（可重试）" : ""}`);
      }
    });
    if (!finished) throw new Error("流式回答在 done 事件前中断");
    return {
      id: messageId,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
      citations,
    };
  }
}
