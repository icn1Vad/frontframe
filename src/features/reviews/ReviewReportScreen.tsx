import { Eye } from "lucide-react";
import { useState } from "react";
import { IconButton, Modal, Status } from "../../shared/ui";

export interface ReviewReportScreenProps {
  readonly taskId: string;
  readonly documentName: string;
}

const reportSections = [
  "审查总结",
  "检测细节",
  "语义检测",
  "冲突检测",
  "一致性检测",
  "风险处理日志",
] as const;

const reportMetrics = [
  ["语义检测", "3 项"],
  ["冲突检测", "2 项"],
  ["一致性检测", "3 项"],
] as const;

export function ReviewReportScreen({
  taskId,
  documentName,
}: ReviewReportScreenProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resolved, setResolved] = useState(false);

  return (
    <>
      <div className="report-shell" data-review-task-id={taskId}>
        <aside className="report-nav" aria-label="报告目录">
          <strong>报告目录</strong>
          {reportSections.map((section, index) => (
            <button
              type="button"
              className={index === 0 ? "selected" : ""}
              aria-current={index === 0 ? "page" : undefined}
              key={section}
            >
              {section}
            </button>
          ))}
        </aside>
        <article className="report-body">
          <header>
            <h2>审查总结</h2>
            <IconButton label="查看原文" onClick={() => setPreviewOpen(true)}>
              <Eye />
            </IconButton>
          </header>
          <section className="risk-overview">
            <h3>文件风险概览</h3>
            <p>本次审查发现 8 个风险项：3 个高风险、5 个中风险。重点关注审批职责边界、条款冲突及引用标准不一致。</p>
          </section>
          <div className="report-metrics">
            {reportMetrics.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>
        <aside className="report-actions">
          <small>当前审查文件</small>
          <h3>{documentName}</h3>
          <Status tone={resolved ? "success" : "warning"}>
            {resolved ? "风险已处理" : "待风险处理"}
          </Status>
          <p>{resolved ? "风险已全部处理，可正式入库" : "还有 2 项风险未处理，正式入库禁用"}</p>
          <button className="primary" type="button" onClick={() => setResolved(true)}>
            忽略全部风险项
          </button>
          <div>
            <button className="secondary" type="button">导出报告</button>
            <button className="secondary" type="button" disabled={!resolved}>正式入库</button>
          </div>
        </aside>
      </div>
      {previewOpen ? (
        <Modal
          title="文件预览"
          subtitle="只读查看文件内容，不允许编辑原文件。"
          onClose={() => setPreviewOpen(false)}
        >
          <div className="preview">
            <h3>{documentName}</h3>
            <p>第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议；紧急事项应在 3 个工作日内补充备案。</p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

