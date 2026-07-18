import {
  AlertCircle,
  Check,
  ChevronDown,
  Circle,
  Copy,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useId, useState } from "react";
import type { ChatCitation } from "../../app/services";
import { MarkdownAnswer } from "./MarkdownAnswer";
import type { ActiveChatStream, ChatStreamAction } from "./chatStreamState";

interface CitationDisclosureProps {
  readonly citations: readonly ChatCitation[];
}

export function CitationDisclosure({ citations }: CitationDisclosureProps) {
  if (citations.length === 0) return null;
  return (
    <details className="chat-citations-disclosure">
      <summary>
        <span>参考依据 {citations.length}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </summary>
      <div className="chat-sources" aria-label="回答引用来源">
        {citations.map((citation, index) => (
          <article
            className="chat-source-card"
            key={`${citation.documentId ?? "source"}-${citation.documentName ?? "unknown"}-${citation.location ?? "unknown"}-${index}`}
          >
            <span className="chat-source-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <span className="chat-source-meta">正式入库来源</span>
              <strong>{citation.documentName?.trim() || "来源名称暂缺"}</strong>
              {citation.location ? <small>{citation.location}</small> : null}
              {citation.excerpt ? <small>{citation.excerpt}</small> : null}
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}

interface CopyAnswerButtonProps {
  readonly content: string;
}

export function CopyAnswerButton({ content }: CopyAnswerButtonProps) {
  const [copied, setCopied] = useState(false);
  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button
      type="button"
      className="chat-answer-action"
      disabled={!content}
      onClick={() => void copyAnswer()}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "已复制" : "复制回答"}
    </button>
  );
}

export function AssistantAnswer({
  content,
  citations,
}: {
  readonly content: string;
  readonly citations: readonly ChatCitation[];
}) {
  return (
    <>
      <MarkdownAnswer content={content} />
      <CitationDisclosure citations={citations} />
      <div className="chat-answer-actions">
        <CopyAnswerButton content={content} />
      </div>
    </>
  );
}

function phaseLabel(stream: ActiveChatStream): string {
  if (stream.phase === "connecting") return "正在等待响应";
  if (stream.phase === "recovering") {
    return stream.connected ? "正在恢复回答" : "正在自动恢复";
  }
  if (stream.phase === "generating") return "正在生成";
  if (stream.phase === "completed") return "已完成";
  return "需要处理";
}

function ProcessIcon({ stream }: { readonly stream: ActiveChatStream }) {
  if (stream.phase === "completed") return <Check size={15} aria-hidden="true" />;
  if (stream.phase === "failed") return <AlertCircle size={15} aria-hidden="true" />;
  return <LoaderCircle className="chat-process-spinner" size={15} aria-hidden="true" />;
}

function ProcessSteps({ stream }: { readonly stream: ActiveChatStream }) {
  const connectionFailed = stream.phase === "failed" && !stream.connected;
  const recoveryFailed = stream.phase === "failed" && stream.autoRecoveryUsed && !stream.resumed;
  const answerCompleted = stream.phase === "completed";
  const answerFailed = stream.phase === "failed";
  const answerPending = !stream.connected && !answerCompleted && !answerFailed;
  return (
    <ol className="chat-process-steps">
      <li className="complete"><Check size={13} />请求已提交</li>
      <li className={stream.connected ? "complete" : connectionFailed ? "failed" : "active"}>
        {stream.connected ? <Check size={13} /> : connectionFailed ? <AlertCircle size={13} /> : <LoaderCircle size={13} />}
        {stream.connected ? "已建立流式连接" : connectionFailed ? "流式连接未建立" : "正在建立流式连接"}
      </li>
      {stream.autoRecoveryUsed || stream.resumed ? (
        <li className={stream.resumed ? "complete" : recoveryFailed ? "failed" : "active"}>
          {stream.resumed ? <Check size={13} /> : recoveryFailed ? <AlertCircle size={13} /> : <LoaderCircle size={13} />}
          {stream.resumed ? "已恢复已有回答" : recoveryFailed ? "自动恢复未成功" : "正在使用原请求恢复"}
        </li>
      ) : null}
      <li className={answerCompleted ? "complete" : answerFailed ? "failed" : answerPending ? "pending" : "active"}>
        {answerCompleted ? <Check size={13} /> : answerFailed ? <AlertCircle size={13} /> : answerPending ? <Circle size={10} /> : <LoaderCircle size={13} />}
        {answerCompleted
          ? "回答已完成"
          : answerFailed
            ? "生成已中断"
            : answerPending
              ? "连接后开始接收回答"
              : stream.content
                ? "正在接收回答正文"
                : "连接已建立，等待首段回答"}
      </li>
      {stream.citations.length > 0 ? (
        <li className="complete"><Check size={13} />已收集 {stream.citations.length} 条参考依据</li>
      ) : null}
    </ol>
  );
}

export interface StreamingAnswerProps {
  readonly stream: ActiveChatStream;
  readonly sending: boolean;
  readonly dispatch: (action: ChatStreamAction) => void;
  readonly onRetry: () => void;
}

export function StreamingAnswer({
  stream,
  sending,
  dispatch,
  onRetry,
}: StreamingAnswerProps) {
  const processId = useId();
  return (
    <>
      <span className="visually-hidden" role="status" aria-live="polite">
        {phaseLabel(stream)}
      </span>
      <div className={`chat-process ${stream.phase}`}>
        <button
          type="button"
          className="chat-process-toggle"
          aria-expanded={stream.processExpanded}
          aria-controls={processId}
          onClick={() => dispatch({ type: "toggle-process" })}
        >
          <ProcessIcon stream={stream} />
          <span>{phaseLabel(stream)}</span>
          {stream.citations.length > 0 ? <small>· {stream.citations.length} 条依据</small> : null}
          <ChevronDown className="chat-process-chevron" size={15} aria-hidden="true" />
        </button>
        <div id={processId} className="chat-process-panel" hidden={!stream.processExpanded}>
          <ProcessSteps stream={stream} />
        </div>
      </div>

      <div className="chat-stream-answer" aria-busy={sending}>
        {stream.content ? (
          <>
            <MarkdownAnswer content={stream.content} />
            {stream.phase !== "completed" && stream.phase !== "failed" ? (
              <span className="chat-stream-caret" aria-hidden="true" />
            ) : null}
          </>
        ) : stream.phase !== "failed" ? (
          <span className="chat-answer-placeholder">
            {stream.connected ? "连接已建立，正在等待首段回答" : "正在等待问答服务响应"}
            <span aria-hidden="true">…</span>
          </span>
        ) : null}
      </div>

      <CitationDisclosure citations={stream.citations} />

      {stream.errorMessage ? (
        <div className="chat-stream-error" role="alert">
          <AlertCircle size={17} aria-hidden="true" />
          <div>
            <strong>回答未完成</strong>
            <p>{stream.errorMessage}</p>
          </div>
          {stream.retryable ? (
            <button type="button" className="secondary" disabled={sending} onClick={onRetry}>
              <RotateCcw size={14} />继续生成
            </button>
          ) : null}
        </div>
      ) : null}

      {stream.content ? (
        <div className="chat-answer-actions">
          <CopyAnswerButton content={stream.content} />
        </div>
      ) : null}
    </>
  );
}
