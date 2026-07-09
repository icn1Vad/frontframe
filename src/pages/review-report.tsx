import { Eye } from "lucide-react";
import { useState } from "react";
import { Layout } from "../components/Layout";
import { IconButton, Modal, Status } from "../components/Ui";

export default function ReviewReport() {
  const [preview, setPreview] = useState(false);
  const [resolved, setResolved] = useState(false);
  return (
    <Layout title="采购管理办法.docx 的审查报告" subtitle="查看审查结论、风险项和检测细节" active="/review-task">
      <div className="report-shell">
        <aside className="report-nav"><strong>报告目录</strong>{["审查总结","检测细节","语义检测","冲突检测","一致性检测","风险处理日志"].map((v, i) => <button className={i === 0 ? "selected" : ""} key={v}>{v}</button>)}</aside>
        <article className="report-body">
          <header><h2>审查总结</h2><IconButton label="查看原文" onClick={() => setPreview(true)}><Eye /></IconButton></header>
          <section className="risk-overview"><h3>文件风险概览</h3><p>本次审查发现 8 个风险项：3 个高风险、5 个中风险。重点关注审批职责边界、条款冲突及引用标准不一致。</p></section>
          <div className="report-metrics">{[["语义检测","3 项"],["冲突检测","2 项"],["一致性检测","3 项"]].map(([a,b]) => <div key={a}><span>{a}</span><strong>{b}</strong></div>)}</div>
        </article>
        <aside className="report-actions"><small>当前审查文件</small><h3>采购管理办法.docx</h3><Status tone={resolved ? "success" : "warning"}>{resolved ? "风险已处理" : "待风险处理"}</Status><p>{resolved ? "风险已全部处理，可正式入库" : "还有 2 项风险未处理，正式入库禁用"}</p><button className="primary" onClick={() => setResolved(true)}>忽略全部风险项</button><div><button className="secondary">导出报告</button><button className="secondary" disabled={!resolved}>正式入库</button></div></aside>
      </div>
      {preview && <Modal title="文件预览" subtitle="只读查看文件内容，不允许编辑原文件。" onClose={() => setPreview(false)}><div className="preview"><h3>采购管理办法（修订稿）</h3><p>第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议；紧急事项应在 3 个工作日内补充备案。</p></div></Modal>}
    </Layout>
  );
}
