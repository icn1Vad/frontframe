import { AlertTriangle, BookOpen, Send, Trash2 } from "lucide-react";

import { IconButton, Status } from "../../shared/ui";

const chats = [
  "投资审批权限校验",
  "制度金额阈值冲突",
  "董事会审批条款",
  "合同审查问题集",
  "信息披露专题",
] as const;

export function ChatScreen() {
  return (
    <div className="chat-shell">
      <aside className="chat-list" aria-label="提问集列表">
        <div className="chat-list-heading">
          <span>
            <strong>会话记录</strong>
            <small>{chats.length} 个提问集</small>
          </span>
        </div>
        <button type="button" className="primary chat-new-button">
          新建提问集
        </button>
        {chats.map((chat, index) => (
          <div
            className={`chat-list-item ${index === 0 ? "selected" : ""}`}
            aria-current={index === 0 ? "true" : undefined}
            key={chat}
          >
            <span className="chat-list-copy">
              <strong>{chat}</strong>
              <small>{index === 0 ? "当前会话" : "历史提问集"}</small>
            </span>
            {index > 0 ? (
              <Trash2 className="chat-delete-icon" size={14} aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </aside>
      <section className="chat-main">
        <header className="chat-main-header">
          <div>
            <small>当前提问集</small>
            <h2>投资审批权限校验</h2>
            <p>基于正式入库知识库回答，不支持临时上传文件</p>
          </div>
          <span className="chat-knowledge-scope">
            <BookOpen size={15} aria-hidden="true" />
            仅基于正式入库知识库
          </span>
        </header>
        <div className="messages" aria-label="问答内容">
          <div className="message-stream">
            <div className="message message-user">
              <b className="avatar me">我</b>
              <div className="message-body">
                <div className="message-author">
                  <strong>你</strong>
                </div>
                <p>成员公司对外投资超过 3000 万元时，需要经过哪些审批？</p>
              </div>
            </div>
            <div className="message message-assistant">
              <b className="avatar ai">AI</b>
              <div className="message-body">
                <div className="message-author">
                  <strong>制度助手</strong>
                  <Status tone="info">已进入审查</Status>
                </div>
                <p>根据当前制度库，超过 3000 万元的对外投资应先完成项目评审和合规审查，再提交成员公司董事会审议；达到集团重大事项标准的，还需报集团审批。</p>
                <div className="chat-sources" aria-label="回答引用来源">
                  <article className="chat-source-card">
                    <span className="chat-source-index">01</span>
                    <div>
                      <span className="chat-source-meta">正式入库来源</span>
                      <strong>《对外投资管理制度》第 5.1 条</strong>
                      <small>单项投资达到集团规定标准的，应履行集团审批程序。</small>
                    </div>
                  </article>
                  <article className="chat-source-card">
                    <span className="chat-source-index">02</span>
                    <div>
                      <span className="chat-source-meta">正式入库来源</span>
                      <strong>《成员公司投资细则》第 3.2 条</strong>
                      <small>单项投资超过 3000 万元的，应提交董事会审议。</small>
                    </div>
                  </article>
                </div>
                <aside className="chat-conflict-note">
                  <AlertTriangle size={17} aria-hidden="true" />
                  <div>
                    <strong>待复核冲突</strong>
                    <p>金额阈值与审批主体存在差异，建议在正式采用前完成制度复核。</p>
                  </div>
                </aside>
                <small className="scope">回答范围：正式入库知识库</small>
              </div>
            </div>
          </div>
        </div>
        <footer className="chat-composer">
          <form className="chat-input" onSubmit={(event) => event.preventDefault()}>
            <input
              aria-label="问题"
              placeholder="继续追问，或要求对比具体条款……"
            />
            <IconButton label="发送" type="submit">
              <Send />
            </IconButton>
          </form>
          <small>回答仅供参考，关键制度结论请结合引用原文复核。</small>
        </footer>
      </section>
    </div>
  );
}
