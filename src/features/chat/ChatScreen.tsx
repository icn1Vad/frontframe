import { BookOpen, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  ChatApi,
  ChatCitation,
  ChatConversation,
} from "../../app/services";
import { createIdempotencyKey } from "../../shared/lib/idempotency";
import { IconButton, Status } from "../../shared/ui";
import { ChatStreamError } from "./ChatStreamError";

export interface ChatScreenProps {
  readonly api: ChatApi;
}

interface RetryRequest {
  readonly conversationId: string;
  readonly question: string;
  readonly idempotencyKey: string;
}

export function ChatScreen({ api }: ChatScreenProps) {
  const [conversations, setConversations] = useState<readonly ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] =
    useState<ChatConversation | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [streamedCitations, setStreamedCitations] = useState<readonly ChatCitation[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [retryRequest, setRetryRequest] = useState<RetryRequest | null>(null);

  const loadConversations = useCallback(async (preferredId?: string) => {
    const items = await api.listConversations();
    setConversations(items);
    const nextId =
      preferredId && items.some((item) => item.id === preferredId)
        ? preferredId
        : items[0]?.id ?? null;
    setActiveId(nextId);
    setActiveConversation(nextId ? (await api.getConversation(nextId)) ?? null : null);
  }, [api]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void api.listConversations()
      .then(async (items) => {
        if (!active) return;
        setConversations(items);
        const firstId = items[0]?.id ?? null;
        setActiveId(firstId);
        setActiveConversation(
          firstId ? (await api.getConversation(firstId)) ?? null : null,
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setFeedback(error instanceof Error ? error.message : "会话加载失败");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const selectConversation = async (id: string) => {
    setActiveId(id);
    setActiveConversation((await api.getConversation(id)) ?? null);
    setFeedback(null);
    setRetryRequest(null);
  };

  const createConversation = async () => {
    if (pendingAction) return;
    setPendingAction("create");
    setFeedback(null);
    try {
      const conversation = await api.createConversation(undefined, {
        idempotencyKey: createIdempotencyKey("create-chat-conversation"),
      });
      await loadConversations(conversation.id);
      setFeedback("已新建提问集");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? `创建提问集失败：${error.message}`
          : "创建提问集失败，请稍后重试",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const deleteConversation = async (id: string) => {
    if (pendingAction) return;
    setPendingAction(`delete:${id}`);
    setFeedback(null);
    try {
      await api.deleteConversation(id, {
        idempotencyKey: createIdempotencyKey("delete-chat-conversation"),
      });
      await loadConversations(activeId === id ? undefined : activeId ?? undefined);
      setFeedback("提问集已删除");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? `删除提问集失败：${error.message}`
          : "删除提问集失败，请稍后重试",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const sendQuestion = async (request: RetryRequest) => {
    if (sending) return;
    setSending(true);
    setPendingQuestion(request.question);
    setStreamedContent("");
    setStreamedCitations([]);
    setFeedback(null);
    try {
      await api.sendMessage(request.conversationId, request.question, {
        idempotencyKey: request.idempotencyKey,
        onDelta: (content) => setStreamedContent((current) => current + content),
        onCitation: (citation) => {
          setStreamedCitations((current) => [...current, citation]);
        },
      });
      setRetryRequest(null);
      setQuestion("");
      await loadConversations(request.conversationId);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "发送失败，请稍后重试");
      setQuestion(request.question);
      setRetryRequest(error instanceof ChatStreamError && error.retryable ? request : null);
    } finally {
      setSending(false);
      setPendingQuestion(null);
      setStreamedContent("");
      setStreamedCitations([]);
    }
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentQuestion = question.trim();
    if (!activeId || !currentQuestion || currentQuestion.length > 4000 || sending) return;
    const request = {
      conversationId: activeId,
      question: currentQuestion,
      idempotencyKey: createIdempotencyKey("send-chat-message"),
    };
    setQuestion("");
    setRetryRequest(null);
    void sendQuestion(request);
  };

  return (
    <div className="chat-shell">
      <aside className="chat-list" aria-label="提问集列表">
        <div className="chat-list-heading">
          <span>
            <strong>会话记录</strong>
            <small>{conversations.length} 个提问集</small>
          </span>
        </div>
        <button
          type="button"
          className="primary chat-new-button"
          disabled={pendingAction !== null}
          onClick={() => void createConversation()}
        >
          {pendingAction === "create" ? <span className="button-spinner" /> : <Plus size={15} />}
          {pendingAction === "create" ? "正在新建…" : "新建提问集"}
        </button>
        {conversations.map((conversation) => (
          <div
            className={`chat-list-item ${conversation.id === activeId ? "selected" : ""}`}
            aria-current={conversation.id === activeId ? "true" : undefined}
            key={conversation.id}
          >
            <button
              type="button"
              className="chat-list-select"
              onClick={() => void selectConversation(conversation.id)}
            >
              <span className="chat-list-copy">
                <strong>{conversation.title}</strong>
                <small>{conversation.id === activeId ? "当前会话" : "历史提问集"}</small>
              </span>
            </button>
            <IconButton
              className="chat-delete-button"
              label={`删除${conversation.title}`}
              disabled={pendingAction !== null}
              onClick={() => void deleteConversation(conversation.id)}
            >
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
      </aside>

      <section className="chat-main">
        <div className="chat-mobile-controls">
          <label>
            <span>当前提问集</span>
            <select
              value={activeId ?? ""}
              disabled={loading || conversations.length === 0}
              onChange={(event) => void selectConversation(event.target.value)}
            >
              {conversations.map((conversation) => (
                <option value={conversation.id} key={conversation.id}>
                  {conversation.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            disabled={pendingAction !== null}
            onClick={() => void createConversation()}
          >
            <Plus size={14} />新建
          </button>
          <button
            type="button"
            className="secondary danger-action"
            disabled={!activeId || pendingAction !== null}
            onClick={() => activeId ? void deleteConversation(activeId) : undefined}
          >
            <Trash2 size={14} />删除
          </button>
        </div>

        <header className="chat-main-header">
          <div>
            <small>当前提问集</small>
            <h2>{activeConversation?.title ?? "智能问答"}</h2>
            <p>基于正式入库知识库回答，不支持临时上传文件</p>
          </div>
          <span className="chat-knowledge-scope">
            <BookOpen size={15} aria-hidden="true" />
            仅基于正式入库知识库
          </span>
        </header>

        <div className="messages" aria-label="问答内容" aria-busy={loading}>
          <div className="message-stream">
            {!loading && !activeConversation ? (
              <div className="table-state">暂无提问集，请先新建会话。</div>
            ) : null}
            {!loading && activeConversation?.messages.length === 0 ? (
              <div className="chat-welcome">
                <BookOpen size={24} />
                <strong>从正式知识库开始提问</strong>
                <p>回答会列出引用文件，便于返回原文复核。</p>
              </div>
            ) : null}
            {activeConversation?.messages.map((message) => (
              <div
                className={`message ${
                  message.role === "user" ? "message-user" : "message-assistant"
                }`}
                key={message.id}
              >
                <b className={`avatar ${message.role === "user" ? "me" : "ai"}`}>
                  {message.role === "user" ? "我" : "智"}
                </b>
                <div className="message-body">
                  <div className="message-author">
                    <strong>{message.role === "user" ? "你" : "制度助手"}</strong>
                    {message.role === "assistant" ? (
                      <Status tone="info">基于知识库</Status>
                    ) : null}
                  </div>
                  <p>{message.content}</p>
                  {message.citations.length > 0 ? (
                    <div className="chat-sources" aria-label="回答引用来源">
                      {message.citations.map((citation, index) => (
                        <article className="chat-source-card" key={citation.documentId}>
                          <span className="chat-source-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <span className="chat-source-meta">正式入库来源</span>
                            <strong>{citation.documentName}</strong>
                            {citation.location ? <small>{citation.location}</small> : null}
                            {citation.excerpt ? <small>{citation.excerpt}</small> : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {sending ? (
              <>
                <div className="message message-user">
                  <b className="avatar me">我</b>
                  <div className="message-body">
                    <div className="message-author"><strong>你</strong></div>
                    <p>{pendingQuestion}</p>
                  </div>
                </div>
                <div className="message message-assistant">
                  <b className="avatar ai">智</b>
                  <div className="message-body">
                    <div className="message-author">
                      <strong>制度助手</strong>
                      <Status tone="info">实时生成</Status>
                    </div>
                    <p>{streamedContent || "正在检索正式知识库并整理回答…"}</p>
                    {streamedCitations.length > 0 ? (
                      <div className="chat-sources" aria-label="实时回答引用来源">
                        {streamedCitations.map((citation, index) => (
                          <article className="chat-source-card" key={`${citation.documentId}-${index}`}>
                            <span className="chat-source-index">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <span className="chat-source-meta">正式入库来源</span>
                              <strong>{citation.documentName}</strong>
                              {citation.location ? <small>{citation.location}</small> : null}
                              {citation.excerpt ? <small>{citation.excerpt}</small> : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <footer className="chat-composer">
          <form className="chat-input" onSubmit={submitQuestion}>
            <input
              aria-label="问题"
              value={question}
              maxLength={4000}
              disabled={!activeId || sending}
              placeholder="继续追问，或要求对比具体条款……"
              onChange={(event) => setQuestion(event.target.value)}
            />
            <IconButton
              label="发送"
              type="submit"
              disabled={!activeId || !question.trim() || sending}
            >
              {sending ? <span className="button-spinner" /> : <Send />}
            </IconButton>
          </form>
          <small>{question.length}/4000 · 回答仅供参考，关键制度结论请结合引用原文复核。</small>
          <div className="action-feedback-slot" role="status" aria-live="polite">
            {feedback ? (
              <span className={feedback.includes("失败") ? "error" : undefined}>
                {feedback}
              </span>
            ) : null}
            {retryRequest ? (
              <button type="button" className="secondary" disabled={sending} onClick={() => void sendQuestion(retryRequest)}>
                <RotateCcw size={14} /> 使用原请求重试
              </button>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  );
}
