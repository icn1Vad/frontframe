import { Send, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { IconButton, Status } from "../components/Ui";

const chats = ["投资审批权限校验","制度金额阈值冲突","董事会审批条款","合同审查问题集","信息披露专题"];

export default function Chat() {
  return (
    <Layout title="智能问答" subtitle="基于正式入库知识库提供智能可追溯回答">
      <div className="chat-shell">
        <aside className="chat-list"><button className="primary">新建提问集</button>{chats.map((c, i) => <div className={i === 0 ? "selected" : ""} key={c}><span>{c}</span>{i > 0 && <Trash2 size={13} />}</div>)}</aside>
        <section className="chat-main">
          <header><h2>投资审批权限校验</h2><p>基于正式入库知识库回答，不支持临时上传文件</p></header>
          <div className="messages">
            <div className="message"><b className="avatar me">我</b><div><strong>你</strong><p>成员公司对外投资超过 3000 万元时，需要经过哪些审批？</p></div></div>
            <div className="message"><b className="avatar ai">AI</b><div><strong>制度助手</strong><Status tone="info">已进入审查</Status><p>根据当前制度库，超过 3000 万元的对外投资应先完成项目评审和合规审查，再提交成员公司董事会审议；达到集团重大事项标准的，还需报集团审批。</p>
              <blockquote><strong>[1]《对外投资管理制度》第 5.1 条</strong><small>单项投资达到集团规定标准的，应履行集团审批程序。</small></blockquote>
              <blockquote><strong>[2]《成员公司投资细则》第 3.2 条</strong><small>单项投资超过 3000 万元的，应提交董事会审议。</small></blockquote>
              <aside><strong>待复核冲突</strong><p>金额阈值与审批主体存在差异，建议在正式采用前完成制度复核。</p></aside>
              <small className="scope">回答范围：正式入库知识库</small>
            </div></div>
          </div>
          <form className="chat-input" onSubmit={(e) => e.preventDefault()}><input placeholder="继续追问，或要求对比具体条款……" /><IconButton label="发送"><Send /></IconButton></form>
        </section>
      </div>
    </Layout>
  );
}
