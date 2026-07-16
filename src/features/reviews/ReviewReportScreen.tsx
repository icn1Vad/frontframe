import { CheckCircle2, Eye, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  ReviewReport,
  ReviewRisk,
  ReviewRiskState,
} from "../documents/application";
import { IconButton, Modal, Status } from "../../shared/ui";

type RiskMutation = (
  riskId: string,
  reason?: string,
) => Promise<ReviewReport>;

export interface ReviewReportScreenProps {
  readonly taskId: string;
  readonly documentName: string;
  readonly initialReport: ReviewReport;
  readonly onResolveRisk: RiskMutation;
  readonly onIgnoreRisk: RiskMutation;
  readonly onIgnoreAllRisks: (reason: string) => Promise<ReviewReport>;
  readonly onPublish?: () => void | Promise<void>;
  readonly readOnly?: boolean;
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

const categoryLabels = {
  semantic: "语义检测",
  conflict: "冲突检测",
  consistency: "一致性检测",
} as const;

const levelLabels = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
} as const;

const riskStateLabels: Record<ReviewRiskState, string> = {
  open: "待处理",
  resolved: "已处理",
  ignored: "已忽略",
};

function riskTone(risk: ReviewRisk) {
  if (risk.state === "resolved") return "success" as const;
  if (risk.state === "ignored") return "neutral" as const;
  if (risk.level === "high") return "danger" as const;
  if (risk.level === "medium") return "warning" as const;
  return "info" as const;
}

function sectionRisks(
  report: ReviewReport,
  section: ReportSection,
): readonly ReviewRisk[] {
  if (section === "语义检测") {
    return report.risks.filter((risk) => risk.category === "semantic");
  }
  if (section === "冲突检测") {
    return report.risks.filter((risk) => risk.category === "conflict");
  }
  if (section === "一致性检测") {
    return report.risks.filter((risk) => risk.category === "consistency");
  }
  return report.risks;
}

export function ReviewReportScreen({
  taskId,
  documentName,
  initialReport,
  onResolveRisk,
  onIgnoreRisk,
  onIgnoreAllRisks,
  onPublish,
  readOnly = false,
}: ReviewReportScreenProps) {
  const [report, setReport] = useState(initialReport);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ReportSection>("审查总结");
  const [ignoreTarget, setIgnoreTarget] = useState<
    { readonly kind: "single"; readonly riskId: string } | { readonly kind: "all" } | null
  >(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  useEffect(() => setReport(initialReport), [initialReport]);

  const openRisks = report.risks.filter((risk) => risk.state === "open");
  const handledRisks = report.risks.filter((risk) => risk.state !== "open");
  const visibleRisks = useMemo(
    () => sectionRisks(report, activeSection),
    [activeSection, report],
  );
  const metrics = useMemo(
    () => ({
      semantic: report.risks.filter((risk) => risk.category === "semantic").length,
      conflict: report.risks.filter((risk) => risk.category === "conflict").length,
      consistency: report.risks.filter((risk) => risk.category === "consistency").length,
    }),
    [report],
  );

  const runRiskMutation = async (
    riskId: string,
    state: "resolved" | "ignored",
    reason?: string,
  ) => {
    setPendingAction(`${state}-${riskId}`);
    setFeedback(null);
    try {
      const updated =
        state === "resolved"
          ? await onResolveRisk(riskId)
          : await onIgnoreRisk(riskId, reason);
      setReport(updated);
      setFeedback(state === "resolved" ? "风险已标记为已处理" : "风险已记录为忽略");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "风险处理失败，请稍后重试",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const submitIgnore = async () => {
    if (!ignoreTarget || !ignoreReason.trim()) return;
    if (ignoreTarget.kind === "single") {
      await runRiskMutation(ignoreTarget.riskId, "ignored", ignoreReason);
      setIgnoreTarget(null);
      setIgnoreReason("");
      return;
    }
    setPendingAction("ignore-all");
    setFeedback(null);
    try {
      const updated = await onIgnoreAllRisks(ignoreReason.trim());
      setReport(updated);
      setFeedback("全部待处理风险已记录为忽略");
      setIgnoreTarget(null);
      setIgnoreReason("");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "风险处理失败，请稍后重试",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const publish = async () => {
    if (!onPublish || openRisks.length > 0) return;
    setPendingAction("publish");
    setFeedback(null);
    try {
      await onPublish();
      setPublished(true);
      setFeedback("文件已正式入库");
    } catch (error) {
      setFeedback(
        error instanceof Error ? `入库失败：${error.message}` : "入库失败，请稍后重试",
      );
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      <div className="report-mobile-navigation">
        <label htmlFor="report-section-select">报告目录</label>
        <select
          id="report-section-select"
          value={activeSection}
          onChange={(event) => setActiveSection(event.target.value as ReportSection)}
        >
          {reportSections.map((section) => (
            <option value={section} key={section}>
              {section}
            </option>
          ))}
        </select>
      </div>
      <div
        className={`report-shell${openRisks.length === 0 ? " resolved" : ""}`}
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
              <p className="report-section-description">{report.summary}</p>
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
                <h3>{report.termination ? "终止审查概览" : "文件风险概览"}</h3>
                <p>
                  {report.termination
                    ? `审查在 ${report.termination.progress}% 时由 ${report.termination.operator} 终止，终止前识别 ${report.termination.discoveredRiskCount} 个风险项。`
                    : `本次审查发现 ${report.risks.length} 个风险项，其中 ${openRisks.length} 个待处理、${handledRisks.length} 个已处理。`}
                </p>
                {report.termination ? (
                  <small>终止时间：{report.termination.terminatedAt}</small>
                ) : null}
              </section>
              <div className="report-metrics">
                <div><span>语义检测</span><strong>{metrics.semantic} 项</strong></div>
                <div><span>冲突检测</span><strong>{metrics.conflict} 项</strong></div>
                <div><span>一致性检测</span><strong>{metrics.consistency} 项</strong></div>
              </div>
            </>
          ) : null}

          {activeSection === "风险处理日志" ? (
            <section className="report-risk-log">
              {handledRisks.length === 0 ? (
                <p className="table-state">暂无风险处理记录</p>
              ) : (
                handledRisks.map((risk) => (
                  <article key={risk.id}>
                    <Status tone={riskTone(risk)}>{riskStateLabels[risk.state]}</Status>
                    <div>
                      <strong>{risk.title}</strong>
                      <p>
                        {risk.resolution?.operator} · {risk.resolution?.handledAt}
                      </p>
                      {risk.resolution?.reason ? (
                        <small>理由：{risk.resolution.reason}</small>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </section>
          ) : (
            <section className="report-risk-list" aria-label="风险项目">
              {visibleRisks.map((risk) => (
                <article className={`report-risk-card ${risk.state}`} key={risk.id}>
                  <div className="report-risk-heading">
                    <span>
                      <Status tone={riskTone(risk)}>
                        {riskStateLabels[risk.state]}
                      </Status>
                      <small>{categoryLabels[risk.category]} · {levelLabels[risk.level]}</small>
                    </span>
                    {risk.state === "resolved" ? <CheckCircle2 size={18} /> : null}
                    {risk.state === "ignored" ? <ShieldAlert size={18} /> : null}
                  </div>
                  <h3>{risk.title}</h3>
                  <p>{risk.summary}</p>
                  <blockquote>{risk.evidence}</blockquote>
                  <div className="report-risk-suggestion">
                    <strong>处理建议</strong>
                    <p>{risk.suggestion}</p>
                  </div>
                  {risk.resolution?.reason ? (
                    <small className="report-risk-reason">
                      忽略理由：{risk.resolution.reason}
                    </small>
                  ) : null}
                  {risk.state === "open" && !readOnly ? (
                    <div className="report-risk-actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={Boolean(pendingAction)}
                        onClick={() => void runRiskMutation(risk.id, "resolved")}
                      >
                        {pendingAction === `resolved-${risk.id}` ? (
                          <span className="button-spinner" aria-hidden="true" />
                        ) : null}
                        标记已处理
                      </button>
                      <button
                        type="button"
                        className="secondary danger-action"
                        disabled={Boolean(pendingAction)}
                        onClick={() => setIgnoreTarget({ kind: "single", riskId: risk.id })}
                      >
                        忽略风险
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          )}
        </article>

        <aside className="report-actions">
          <small>当前审查文件</small>
          <h3>{documentName}</h3>
          <Status
            className="report-status"
            tone={openRisks.length === 0 ? "success" : "warning"}
          >
            {openRisks.length === 0 ? "风险已全部处理" : `${openRisks.length} 项待处理`}
          </Status>
          <p className="report-action-summary">
            {readOnly
              ? "该报告为已归档记录，仅支持查看和追溯。"
              : openRisks.length === 0
              ? "全部风险均已处理，可以正式入库。"
              : "请逐项处理或填写理由后忽略风险。"}
          </p>
          {!readOnly ? (
            <button
              className="secondary danger-action report-ignore-all-button"
              type="button"
              disabled={openRisks.length === 0 || Boolean(pendingAction)}
              onClick={() => setIgnoreTarget({ kind: "all" })}
            >
              忽略全部待处理风险
            </button>
          ) : null}
          {onPublish && !readOnly ? (
            <button
              className="primary report-publish-button"
              type="button"
              disabled={published || openRisks.length > 0 || Boolean(pendingAction)}
              title={openRisks.length > 0 ? "仍有风险未处理" : undefined}
              onClick={() => void publish()}
            >
              {pendingAction === "publish" ? (
                <span className="button-spinner" aria-hidden="true" />
              ) : null}
              {published
                ? "已入库"
                : pendingAction === "publish"
                  ? "入库中…"
                  : "正式入库"}
            </button>
          ) : null}
          <div className="report-feedback-slot" role="status" aria-live="polite">
            {feedback ? <span>{feedback}</span> : null}
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
            <p>
              第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议；紧急事项应在 3 个工作日内补充备案。
            </p>
          </div>
        </Modal>
      ) : null}

      {ignoreTarget ? (
        <Modal
          title={ignoreTarget.kind === "all" ? "忽略全部待处理风险" : "忽略风险"}
          subtitle="忽略操作将记录操作者、时间和理由。"
          onClose={() => {
            setIgnoreTarget(null);
            setIgnoreReason("");
          }}
        >
          <label className="report-ignore-reason">
            <span>忽略理由</span>
            <textarea
              rows={4}
              value={ignoreReason}
              placeholder="请输入忽略该风险的业务理由"
              onChange={(event) => setIgnoreReason(event.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setIgnoreTarget(null);
                setIgnoreReason("");
              }}
            >
              取消
            </button>
            <button
              className="primary danger-action"
              type="button"
              disabled={!ignoreReason.trim() || Boolean(pendingAction)}
              onClick={() => void submitIgnore()}
            >
              {pendingAction?.startsWith("ignore") ? (
                <span className="button-spinner" aria-hidden="true" />
              ) : null}
              确认忽略
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
