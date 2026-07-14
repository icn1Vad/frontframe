import { Eye } from "lucide-react";
import { useState } from "react";
import { IconButton, Modal, Status } from "../../shared/ui";

type ReportAction = () => void | Promise<void>;

export interface ReviewReportScreenProps {
  readonly taskId: string;
  readonly documentName: string;
  readonly onExportReport?: ReportAction;
  readonly onPublish?: ReportAction;
  readonly onIgnoreAllRisks?: ReportAction;
}

const reportSections = [
  "审查总结",
  "检测细节",
  "语义检测",
  "冲突检测",
  "一致性检测",
  "风险处理日志",
] as const;

type ReportSection = (typeof reportSections)[number];

const reportSectionDescriptions: Record<ReportSection, string> = {
  审查总结: "汇总本次审查的风险数量与检测结果。",
  检测细节: "详细检测条目将在审查报告接口接入后展示。",
  语义检测: "语义风险明细将在审查报告接口接入后展示。",
  冲突检测: "条款冲突明细将在审查报告接口接入后展示。",
  一致性检测: "一致性问题明细将在审查报告接口接入后展示。",
  风险处理日志: "风险处理记录将在审查报告接口接入后展示。",
};

const reportMetrics = [
  ["语义检测", "3 项"],
  ["冲突检测", "2 项"],
  ["一致性检测", "3 项"],
] as const;

export function ReviewReportScreen({
  taskId,
  documentName,
  onExportReport,
  onPublish,
  onIgnoreAllRisks,
}: ReviewReportScreenProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ignoreConfirmationOpen, setIgnoreConfirmationOpen] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ReportSection>("审查总结");
  const [pendingAction, setPendingAction] =
    useState<"export" | "publish" | "ignore" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const runAction = async (
    kind: "export" | "publish",
    action: ReportAction | undefined,
  ) => {
    if (!action) return;
    setPendingAction(kind);
    setFeedback(null);
    try {
      await action();
      setFeedback(kind === "export" ? "报告已导出" : "文件已正式入库");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? `${kind === "export" ? "导出" : "入库"}失败：${error.message}`
          : `${kind === "export" ? "导出" : "入库"}失败，请稍后重试`,
      );
    } finally {
      setPendingAction(null);
    }
  };

  const publishDisabledReason = !resolved
    ? "仍有风险未处理"
    : !onPublish
      ? "正式入库接口尚未接入"
      : pendingAction
        ? "请等待当前操作完成"
        : undefined;
  const exportDisabledReason = !onExportReport
    ? "导出报告接口尚未接入"
    : pendingAction
      ? "请等待当前操作完成"
      : undefined;
  const ignoreDisabledReason = resolved
    ? "风险已全部处理"
    : !onIgnoreAllRisks
      ? "风险处理接口尚未接入"
      : pendingAction
        ? "请等待当前操作完成"
        : undefined;

  return (
    <>
      <div
        className={`report-shell${resolved ? " resolved" : ""}`}
        data-review-task-id={taskId}
      >
        <aside className="report-nav" aria-label="报告目录">
          <strong>报告目录</strong>
          {reportSections.map((section) => {
            const selected = section === activeSection;
            return (
              <button
                type="button"
                className={selected ? "selected" : ""}
                aria-current={selected ? "page" : undefined}
                onClick={() => setActiveSection(section)}
                key={section}
              >
                {section}
              </button>
            );
          })}
        </aside>
        <article className="report-body">
          <header>
            <div>
              <h2>{activeSection}</h2>
              <p className="report-section-description">
                {reportSectionDescriptions[activeSection]}
              </p>
            </div>
            <IconButton
              className="mobile-text-action"
              label="查看原文"
              visibleLabel="原文"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye />
            </IconButton>
          </header>
          {activeSection === "审查总结" ? (
            <>
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
            </>
          ) : (
            <section className="report-section-placeholder" aria-live="polite">
              <h3>{activeSection}</h3>
              <p>{reportSectionDescriptions[activeSection]}</p>
            </section>
          )}
        </article>
        <aside className="report-actions">
          <small>当前审查文件</small>
          <h3>{documentName}</h3>
          <Status
            className="report-status"
            tone={resolved ? "success" : "warning"}
          >
            {resolved ? "风险已处理" : "待风险处理"}
          </Status>
          <p className="report-action-summary">
            {resolved
              ? onPublish
                ? "风险已全部处理，可正式入库"
                : "风险已全部处理；接入正式入库接口后可提交"
              : "还有 2 项风险未处理，正式入库禁用"}
          </p>
          <button
            className="primary report-resolve-button"
            type="button"
            disabled={Boolean(ignoreDisabledReason)}
            title={ignoreDisabledReason}
            onClick={() => setIgnoreConfirmationOpen(true)}
          >
            {resolved ? "风险已全部处理" : "忽略全部风险项"}
          </button>
          <div className="report-action-buttons">
            <button
              className="secondary"
              type="button"
              disabled={Boolean(exportDisabledReason)}
              title={exportDisabledReason}
              onClick={() => void runAction("export", onExportReport)}
            >
              {pendingAction === "export" ? (
                <span className="button-spinner" aria-hidden="true" />
              ) : null}
              {pendingAction === "export" ? "导出中…" : "导出报告"}
            </button>
            <button
              className="secondary"
              type="button"
              disabled={Boolean(publishDisabledReason)}
              title={publishDisabledReason}
              onClick={() => void runAction("publish", onPublish)}
            >
              {pendingAction === "publish" ? (
                <span className="button-spinner" aria-hidden="true" />
              ) : null}
              {pendingAction === "publish" ? "入库中…" : "正式入库"}
            </button>
          </div>
          {!onExportReport || !onPublish ? (
            <p className="report-action-help">
              灰色操作尚未接入后端；按钮标题标注了具体原因。
            </p>
          ) : null}
          <div className="report-feedback-slot" role="status" aria-live="polite">
            {feedback ? (
              <span className={feedback.includes("失败") ? "error" : undefined}>
                {feedback}
              </span>
            ) : null}
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
      {ignoreConfirmationOpen ? (
        <Modal
          title="忽略全部风险项"
          subtitle="该操作会记录当前操作者和处理时间。"
          onClose={() => setIgnoreConfirmationOpen(false)}
        >
          <p className="dialog-copy">
            确认忽略报告中的全部未处理风险项吗？完成后将允许正式入库。
          </p>
          <div className="modal-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => setIgnoreConfirmationOpen(false)}
            >
              取消
            </button>
            <button
              className="primary"
              type="button"
              disabled={pendingAction === "ignore"}
              onClick={async () => {
                setPendingAction("ignore");
                try {
                  await onIgnoreAllRisks?.();
                  setResolved(true);
                  setFeedback("风险处理状态已更新");
                  setIgnoreConfirmationOpen(false);
                } catch (error) {
                  setFeedback(
                    error instanceof Error
                      ? `风险处理失败：${error.message}`
                      : "风险处理失败，请稍后重试",
                  );
                } finally {
                  setPendingAction(null);
                }
              }}
            >
              {pendingAction === "ignore" ? (
                <span className="button-spinner" aria-hidden="true" />
              ) : null}
              {pendingAction === "ignore" ? "处理中…" : "确认忽略"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
