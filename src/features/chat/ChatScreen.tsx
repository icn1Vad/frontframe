import { BookOpen, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  ChatApi,
  ChatConversation,
} from "../../app/services";
import { createIdempotencyKey } from "../../shared/lib/idempotency";
import { IconButton, Status } from "../../shared/ui";
import { ChatStreamError } from "./ChatStreamError";
import {
  areConversationControlsLocked,
  chatStreamReducer,
  createActiveChatStream,
  shouldAutoRecover,
  type ActiveChatStream,
  type ChatStreamAction,
  type ChatStreamRequest,
} from "./chatStreamState";
import { AssistantAnswer, StreamingAnswer } from "./StreamingAnswer";

export interface ChatScreenProps {
  readonly api: ChatApi;
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeStream, setActiveStream] = useState<ActiveChatStream | null>(null);
  const conversationControlsLocked = areConversationControlsLocked(
    sending,
    pendingAction,
  );

  const dispatchStream = useCallback((action: ChatStreamAction) => {
    setActiveStream((current) => current ? chatStreamReducer(current, action) : current);
  }, []);

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
    if (sending) return;
    setActiveId(id);
    setActiveConversation((await api.getConversation(id)) ?? null);
    setFeedback(null);
    setActiveStream(null);
  };

  const createConversation = async () => {
    if (pendingAction || sending) return;
    setPendingAction("create");
    setFeedback(null);
    try {
      const conversation = await api.createConversation(undefined, {
        idempotencyKey: createIdempotencyKey("create-chat-conversation"),
      });
      setConversations((current) => [
        conversation,
        ...current.filter((item) => item.id !== conversation.id),
      ]);
      setActiveId(conversation.id);
      setActiveConversation(conversation);
      setLoading(false);
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
    if (pendingAction || sending) return;
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

  const sendQuestion = async (
    request: ChatStreamRequest,
    preserveCurrentAnswer = false,
  ) => {
    if (sending) return;
    setSending(true);
    setFeedback(null);
    let autoRecoveryUsed = preserveCurrentAnswer
      ? activeStream?.autoRecoveryUsed ?? true
      : false;
    if (preserveCurrentAnswer) dispatchStream({ type: "recover", automatic: false });
    else setActiveStream(createActiveChatStream(request));

    try {
      while (true) {
        let queuedDelta = "";
        let deltaFrame: number | undefined;
        const flushDelta = () => {
          if (!queuedDelta) return;
          const content = queuedDelta;
          queuedDelta = "";
          deltaFrame = undefined;
          dispatchStream({ type: "delta", content });
        };
        const queueDelta = (content: string) => {
          queuedDelta += content;
          if (deltaFrame === undefined) {
            deltaFrame = window.requestAnimationFrame(flushDelta);
          }
        };
        const replaceWithSnapshot = (content: string) => {
          if (deltaFrame !== undefined) window.cancelAnimationFrame(deltaFrame);
          deltaFrame = undefined;
          queuedDelta = "";
          dispatchStream({ type: "snapshot", content });
        };
        try {
          await api.sendMessage(request.conversationId, request.question, {
            idempotencyKey: request.idempotencyKey,
            onMeta: (meta) => dispatchStream({ type: "meta", meta }),
            onSnapshot: (snapshot) => {
              replaceWithSnapshot(snapshot.content);
            },
            onDelta: (delta) => {
              queueDelta(delta.content);
            },
            onCitation: (citation) => {
              dispatchStream({ type: "citation", citation });
            },
          });
          if (deltaFrame !== undefined) window.cancelAnimationFrame(deltaFrame);
          flushDelta();
          dispatchStream({ type: "complete" });
          setQuestion("");
          try {
            await loadConversations(request.conversationId);
            setActiveStream(null);
          } catch (historyError) {
            setFeedback(
              historyError instanceof Error
                ? `回答已完成，但历史消息同步失败：${historyError.message}`
                : "回答已完成，但历史消息同步失败",
            );
          }
          return;
        } catch (error) {
          if (deltaFrame !== undefined) window.cancelAnimationFrame(deltaFrame);
          flushDelta();
          const retryable = error instanceof ChatStreamError && error.retryable;
          if (shouldAutoRecover(retryable, autoRecoveryUsed)) {
            autoRecoveryUsed = true;
            dispatchStream({ type: "recover", automatic: true });
            continue;
          }
          dispatchStream({
            type: "fail",
            message: error instanceof Error ? error.message : "发送失败，请稍后重试",
            retryable,
          });
          return;
        }
      }
    } finally {
      setSending(false);
    }
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentQuestion = question.trim();
    if (!activeId || !currentQuestion || currentQuestion.length > 4000 || sending) return;
    const request: ChatStreamRequest = {
      conversationId: activeId,
      question: currentQuestion,
      idempotencyKey: createIdempotencyKey("send-chat-message"),
    };
    setQuestion("");
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
          disabled={conversationControlsLocked}
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
              disabled={conversationControlsLocked}
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
              disabled={conversationControlsLocked}
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
              disabled={loading || conversations.length === 0 || conversationControlsLocked}
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
            disabled={conversationControlsLocked}
            onClick={() => void createConversation()}
          >
            <Plus size={14} />新建
          </button>
          <button
            type="button"
            className="secondary danger-action"
            disabled={!activeId || conversationControlsLocked}
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

        <div className="messages" aria-label="问答内容" aria-busy={loading || sending}>
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
                  {message.role === "assistant" ? (
                    <div className="message-author">
                      <strong>制度助手</strong>
                      <Status tone="info">基于知识库</Status>
                    </div>
                  ) : null}
                  {message.role === "assistant" ? (
                    <AssistantAnswer
                      content={message.content}
                      citations={message.citations}
                    />
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {activeStream ? (
              <>
                <div className="message message-user">
                  <b className="avatar me">我</b>
                  <div className="message-body">
                    <p>{activeStream.request.question}</p>
                  </div>
                </div>
                <div className="message message-assistant">
                  <b className="avatar ai">智</b>
                  <div className="message-body">
                    <div className="message-author">
                      <strong>制度助手</strong>
                      <Status tone={activeStream.phase === "failed" ? "danger" : activeStream.phase === "completed" ? "success" : "info"}>
                        {activeStream.phase === "failed" ? "回答中断" : activeStream.phase === "completed" ? "回答完成" : "实时生成"}
                      </Status>
                    </div>
                    <StreamingAnswer
                      stream={activeStream}
                      sending={sending}
                      dispatch={dispatchStream}
                      onRetry={() => void sendQuestion(activeStream.request, true)}
                    />
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
          </div>
        </footer>
      </section>
    </div>
  );
}
