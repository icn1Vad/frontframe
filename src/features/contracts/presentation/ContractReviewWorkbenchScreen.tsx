import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Highlighter,
  MessageCircle,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ContractReviewApi } from "../application";
import {
  contractReviewStanceLabels,
  getContractReviewModuleLabel,
  getContractReviewRiskTone,
  type ContractDocumentAnchor,
  type ContractEditorSession,
  type ContractReviewTask,
  type ContractRisk,
  type ContractRiskState,
} from "../domain";
import { routes } from "../../../app";
import { createIdempotencyKey } from "../../../shared/lib/idempotency";
import { Modal, PageStack, Status } from "../../../shared/ui";
import {
  WpsWebOfficeEditor,
  type WpsWebOfficeEditorHandle,
} from "./WpsWebOfficeEditor";
import { ContractReviewSplitPane } from "./ContractReviewSplitPane";

export interface ContractReviewWorkbenchScreenProps {
  readonly taskId: string;
  readonly api: ContractReviewApi;
}

type WorkbenchTab = "risks" | "parse" | "chat";
type SourceView = "original" | "revision";
type EditorMode = "mock" | "wps";

interface ChatMessage {
  readonly id: string;
  readonly role: "assistant" | "user";
  readonly text: string;
  readonly citation?: string;
}

function statusMeta(task: ContractReviewTask) {
  if (task.status === "preview") return { label: "只读预览", tone: "info" as const };
  if (task.status === "stored") return { label: "已入库", tone: "success" as const };
  if (task.status === "reported") return { label: "报告已生成", tone: "warning" as const };
  if (task.status === "reviewing") return { label: "智能审查中", tone: "info" as const };
  return { label: "待开始", tone: "neutral" as const };
}

function levelLabel(level: ContractRisk["level"]): string {
  return level === "high" ? "高风险" : level === "medium" ? "中风险" : "低风险";
}

function buildAnswer(task: ContractReviewTask, question: string, selectedRisk?: ContractRisk) {
  const target = selectedRisk ?? task.risks.find((risk) => risk.state === "open") ?? task.risks[0];
  if (!target) return "当前没有可引用的风险项，请先生成审查报告。";
  if (/怎么改|修改|建议|修订/.test(question)) {
    return `建议修改“${target.title}”：${target.suggestion}`;
  }
  if (/依据|为什么|原因|风险/.test(question)) {
    return `该风险定位在${target.originalText}。主要问题是：${target.summary}`;
  }
  return `基于当前选择的审查范围，最相关的风险是“${target.title}”。${target.summary} 如需处理，可在风险卡片中应用修改或忽略风险。`;
}

function riskAnchor(
  task: ContractReviewTask,
  risk: ContractRisk,
  quotedText = risk.originalText,
): ContractDocumentAnchor {
  return {
    documentId: task.documentId,
    documentVersionId: task.documentVersionId,
    sourceVersion: 1,
    quotedText,
    occurrence: 0,
  };
}

export function ContractReviewWorkbenchScreen({
  taskId,
  api,
}: ContractReviewWorkbenchScreenProps) {
  const [task, setTask] = useState<ContractReviewTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("risks");
  const [sourceView, setSourceView] = useState<SourceView>("original");
  const [editorMode, setEditorMode] = useState<EditorMode>("mock");
  const [editorSession, setEditorSession] = useState<ContractEditorSession | null>(null);
  const [wpsReady, setWpsReady] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busyRiskId, setBusyRiskId] = useState<string | null>(null);
  const [ignoreRiskId, setIgnoreRiskId] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const wpsEditorRef = useRef<WpsWebOfficeEditorHandle>(null);

  const handleWpsReadyChange = useCallback((ready: boolean) => {
    setWpsReady(ready);
  }, []);
  const handleWpsError = useCallback((message: string) => {
    setFeedback(`在线编辑器：${message}`);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const editorSession = api.getEditorSession(taskId).catch((error): ContractEditorSession => ({
      provider: "mock",
      reason: error instanceof Error
        ? `WPS 在线编辑或预览当前不可用：${error.message}`
        : "WPS 在线编辑或预览当前不可用，请检查 Java WPS 配置和公网回调",
    }));
    void Promise.all([api.getTask(taskId), editorSession]).then(([
      result,
      session,
    ]) => {
      if (!active) return;
      const sessionMatchesTask = session.provider !== "wps" || !result || (
        result.fileType === "docx" &&
        session.taskId === result.id &&
        session.documentVersionId === result.documentVersionId
      );
      const safeSession: ContractEditorSession = sessionMatchesTask
        ? session
        : {
            provider: "mock",
            reason: result?.fileType === "pdf"
              ? "PDF 在第一阶段只读预览，不进入 WPS Writer 编辑"
              : "WPS 会话与当前审查任务的文档版本不一致",
          };
      setEditorSession(safeSession);
      setEditorMode(safeSession.provider === "wps" ? "wps" : "mock");
      if (safeSession.provider === "mock") {
        setFeedback(safeSession.reason);
      }
      if (!sessionMatchesTask) {
        setFeedback(result?.fileType === "pdf"
          ? "PDF 当前仅支持只读预览"
          : "已阻止加载与当前任务版本不一致的 WPS 会话");
      }
      if (result) {
        setTask(result);
        setProgress(result.progress);
        setReviewComplete(result.status === "reported" || result.status === "stored");
        setReportGenerated(result.status === "reported" || result.status === "stored");
        setSelectedRiskId(result.risks[0]?.id ?? null);
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            text: "我已加载合同文本。你可以询问风险依据、修改建议或条款之间的冲突，我会返回对应原文位置。",
          },
        ]);
      }
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [api, taskId]);

  useEffect(() => {
    if (!task || task.status !== "queued") return;
    void api.startReview(task.id, {
      idempotencyKey: createIdempotencyKey("start-contract-review"),
      expectedVersion: task.version,
    }).then((updated) => {
      setTask(updated);
      setProgress(updated.progress);
    });
  }, [api, task]);

  useEffect(() => {
    if (!task || task.status !== "reviewing") return;
    setProgress(task.progress);
    setReviewComplete(task.progress >= 100);
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(100, current + 20);
        if (next >= 100) setReviewComplete(true);
        return next;
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [task]);

  const selectedRisk = task?.risks.find((risk) => risk.id === selectedRiskId);
  const activeWpsAnchor = useMemo(
    () => task && selectedRisk ? riskAnchor(task, selectedRisk) : undefined,
    [selectedRisk, task],
  );
  const openRisks = task?.risks.filter((risk) => risk.state === "open") ?? [];
  const handledRisks = task?.risks.filter((risk) => risk.state !== "open") ?? [];
  const canStore = Boolean(
    task && reportGenerated && openRisks.length === 0 && task.status !== "stored",
  );
  const riskCounts = useMemo(() => ({
    high: task?.risks.filter((risk) => risk.level === "high" && risk.state === "open").length ?? 0,
    medium: task?.risks.filter((risk) => risk.level === "medium" && risk.state === "open").length ?? 0,
    low: task?.risks.filter((risk) => risk.level === "low" && risk.state === "open").length ?? 0,
  }), [task]);

  const locateRisk = async (risk: ContractRisk) => {
    setSelectedRiskId(risk.id);
    setActiveTab("risks");
    if (editorMode === "wps") {
      if (!wpsReady || !wpsEditorRef.current) {
        setFeedback("在线编辑器正在加载，请稍后再定位原文");
        return;
      }
      try {
        await wpsEditorRef.current.locate(riskAnchor(task!, risk));
        setFeedback("已在在线文档中高亮风险原文");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "在线文档原文定位失败");
      }
      return;
    }
    window.requestAnimationFrame(() => {
      clauseRefs.current[risk.clauseId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const updateRisk = async (
    risk: ContractRisk,
    state: ContractRiskState,
    reason?: string,
  ) => {
    if (!task || task.status === "stored") return;
    setBusyRiskId(risk.id);
    setFeedback(null);
    try {
      const usingWps = editorMode === "wps" && editorSession?.provider === "wps";
      if (usingWps && (state === "resolved" || (state === "open" && risk.state === "resolved"))) {
        throw new Error("WPS 修订与后端同步将在第三阶段开放；当前已阻止修改旧审查任务");
      }
      const updated = await api.updateRisk(
        task.id,
        risk.id,
        { state, reason },
        {
          idempotencyKey: createIdempotencyKey("update-contract-risk"),
          expectedVersion: task.version,
        },
      );
      setTask(updated);
      if (state === "resolved" && !usingWps) setSourceView("revision");
      setFeedback(
        state === "resolved"
          ? usingWps ? "修订已写入在线文档并触发保存" : "修订已应用到文档预览"
          : state === "ignored"
            ? "风险已记录为人工忽略"
            : usingWps ? "在线文档修订已撤回并保存" : "风险状态已恢复",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "风险状态更新失败");
    } finally {
      setBusyRiskId(null);
    }
  };

  const generateReport = async () => {
    if (!task || !reviewComplete || reportGenerated) return;
    setFeedback(null);
    try {
      const updated = await api.generateReport(task.id, {
        idempotencyKey: createIdempotencyKey("generate-contract-report"),
        expectedVersion: task.version,
      });
      setTask(updated);
      setReportGenerated(true);
      setProgress(100);
      setFeedback("审查报告已生成，可以开始人工处理风险");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "报告生成失败");
    }
  };

  const storeTask = async () => {
    if (!task || !canStore) return;
    try {
      const updated = await api.storeTask(task.id, {
        idempotencyKey: createIdempotencyKey("store-contract-review"),
        expectedVersion: task.version,
      });
      setTask(updated);
      setFeedback("合同审查记录已入库");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "入库失败");
    }
  };

  const saveWpsDocument = async () => {
    if (!task || !wpsEditorRef.current || !wpsReady || finalizing ||
        editorSession?.provider !== "wps" || !editorSession.canFinalize) return;
    setFinalizing(true);
    try {
      await wpsEditorRef.current.save();
      const finalized = await api.finalizeEditor(task.id, {
        idempotencyKey: createIdempotencyKey("finalize-contract-editor"),
      });
      setEditorMode("mock");
      setEditorSession({
        provider: "mock",
        reason: `文档已生成正式版本 ${finalized.versionNumber}；当前审查任务保留为历史记录`,
      });
      setWpsReady(false);
      setFeedback(`已生成正式版本 ${finalized.versionNumber}，请基于新版本重新发起审查`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "在线文档保存失败");
    } finally {
      setFinalizing(false);
    }
  };

  const askQuestion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task || !question.trim() || chatPending) return;
    const currentQuestion = question.trim();
    setQuestion("");
    setChatPending(true);
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: currentQuestion }]);
    window.setTimeout(() => {
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: buildAnswer(task, currentQuestion, selectedRisk),
        citation: selectedRisk ? `${selectedRisk.originalText} · ${selectedRisk.title}` : undefined,
      }]);
      setChatPending(false);
    }, 500);
  };

  if (loading) {
    return <PageStack><SurfaceLikeLoading /></PageStack>;
  }

  if (!task) {
    return <PageStack><div className="contract-not-found"><FileText size={24} /><h2>合同审查任务不存在</h2><Link href={routes.contractReviewTasks} className="secondary">返回合同任务池</Link></div></PageStack>;
  }

  const status = task.status === "preview"
    && editorSession?.provider === "wps"
    && editorSession.canFinalize
    ? { label: "可编辑工作副本", tone: "success" as const }
    : statusMeta(task);

  return (
    <PageStack className="contract-workbench-stack">
      <header className="contract-workbench-header">
        <div className="contract-workbench-title">
          <Link href={routes.contractReviewTasks} className="contract-back-link"><ArrowLeft size={14} /> 返回任务池</Link>
          <div className="contract-eyebrow">合同审查工作台</div>
          <div className="contract-title-line"><FileText size={21} /><h2>{task.name}</h2><Status tone={status.tone}>{status.label}</Status></div>
          <p>{contractReviewStanceLabels[task.stance]} · 已选择 {task.modules.length} 个审查模块</p>
        </div>
        <div className="contract-workbench-actions">
          {reportGenerated ? (
            <button type="button" className="primary" disabled={!canStore} title={canStore ? undefined : "请先处理全部风险项"} onClick={() => void storeTask()}>
              <CheckCircle2 size={15} /> {task.status === "stored" ? "已入库" : "确认并入库"}
            </button>
          ) : (
            <button type="button" className="primary" disabled={!reviewComplete} onClick={() => void generateReport()}>
              <Sparkles size={15} /> {reviewComplete ? "生成审查报告" : "审查进行中"}
            </button>
          )}
        </div>
      </header>

      {!reportGenerated ? (
        <section className="contract-progress-panel">
          <div className="contract-progress-heading"><div><span>智能合同审查</span><strong>{progress}%</strong></div><Status tone="info">正在对照文本分析</Status></div>
          <div className="contract-progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="contract-progress-steps"><span className={progress >= 25 ? "done" : "active"}>读取合同结构</span><ChevronRight size={14} /><span className={progress >= 55 ? "done" : progress >= 25 ? "active" : ""}>执行模块检查</span><ChevronRight size={14} /><span className={progress >= 85 ? "done" : progress >= 55 ? "active" : ""}>生成风险证据</span><ChevronRight size={14} /><span className={progress >= 100 ? "done" : ""}>等待生成报告</span></div>
        </section>
      ) : (
        <section className="contract-report-summary-bar">
          <div><CheckCircle2 size={18} /><span><strong>审查报告已生成</strong><small>请在右侧逐项确认：应用修改或人工忽略，处理完成后才能入库。</small></span></div>
          <div className="contract-report-counts"><span className="high">高 {riskCounts.high}</span><span className="medium">中 {riskCounts.medium}</span><span className="low">低 {riskCounts.low}</span><span className="handled">已处理 {handledRisks.length}</span></div>
        </section>
      )}

      <ContractReviewSplitPane storageKey={`proofspace.contract-review.split.v1:${task.id}`}>
        <article className="contract-source-panel">
          <div className="contract-source-toolbar">
            <div><span className="contract-section-kicker">原文对照</span><h3>{editorMode === "wps" ? "在线文档编辑" : "合同原文"}</h3></div>
            <div className="contract-editor-toolbar-controls">
              <div className="contract-editor-provider-toggle">
                <button type="button" className={editorMode === "mock" ? "selected" : ""} onClick={() => setEditorMode("mock")}>文本预览</button>
                {editorSession?.provider === "wps" ? (
                  <button
                    type="button"
                    className={editorMode === "wps" ? "selected" : ""}
                    onClick={() => setEditorMode("wps")}
                  >
                    在线编辑器
                  </button>
                ) : null}
              </div>
              {editorMode === "mock" ? (
                <div className="contract-source-view-toggle">
                  <button type="button" className={sourceView === "original" ? "selected" : ""} onClick={() => setSourceView("original")}>原文</button>
                  <button type="button" className={sourceView === "revision" ? "selected" : ""} onClick={() => setSourceView("revision")}>修订预览</button>
                </div>
              ) : (
                editorSession?.provider === "wps" && editorSession.canFinalize ? (
                  <button type="button" className="secondary contract-wps-save" disabled={!wpsReady || finalizing} onClick={() => void saveWpsDocument()}><Save size={12} />{finalizing ? "正在生成版本" : "保存并生成新版本"}</button>
                ) : (
                  <button type="button" className="secondary contract-wps-save" disabled><Save size={12} />只读预览</button>
                )
              )}
            </div>
          </div>
          <div className="contract-source-meta">
            <span><FileText size={13} /> {task.name}</span>
            <span>{editorMode === "wps" ? (wpsReady ? "编辑器已连接" : "编辑器连接中") : "第 1 / 3 页"}</span>
            <span className="contract-editor-badge"><Highlighter size={12} /> 点击风险卡片可定位原文</span>
          </div>
          {editorMode === "wps" && editorSession?.provider === "wps" ? (
            <WpsWebOfficeEditor
              ref={wpsEditorRef}
              session={editorSession}
              activeAnchor={activeWpsAnchor}
              onReadyChange={handleWpsReadyChange}
              onError={handleWpsError}
            />
          ) : (
            <div className="contract-document-page">
              <div className="contract-document-heading">软件技术服务合同</div>
              <p className="contract-document-intro">甲方：华东星河科技有限公司　　乙方：远山软件服务有限公司</p>
              {task.clauses.map((clause) => {
                const risk = task.risks.find((item) => item.clauseId === clause.id);
                const selected = risk?.id === selectedRiskId;
                const text = sourceView === "revision" && risk ? risk.suggestion : clause.text;
                return (
                  <div
                    className={`contract-clause${selected ? " selected" : ""}${risk?.state === "resolved" ? " resolved" : ""}`}
                    key={clause.id}
                    ref={(node) => { clauseRefs.current[clause.id] = node; }}
                    onClick={() => risk ? setSelectedRiskId(risk.id) : undefined}
                  >
                    <div className="contract-clause-heading"><span>{clause.number}</span><strong>{clause.title}</strong>{risk ? <span className={`contract-clause-marker ${risk.state}`} /> : null}</div>
                    <p>{selected ? <mark>{text}</mark> : text}</p>
                    {selected && risk ? <small className="contract-clause-source-note">{sourceView === "revision" ? "修订建议预览 · 尚未写入原文件" : `风险定位：${risk.title}`}</small> : null}
                  </div>
                );
              })}
              <p className="contract-document-signature">（以下为合同内容节选，用于原文定位、修订预览和问答引用。）</p>
            </div>
          )}
        </article>

        <aside className="contract-analysis-panel">
          <div className="contract-analysis-tabs" role="tablist" aria-label="合同分析工具">
            <button type="button" role="tab" aria-selected={activeTab === "risks"} className={activeTab === "risks" ? "selected" : ""} onClick={() => setActiveTab("risks")}><ShieldAlert size={15} />风险项目<span>{openRisks.length}</span></button>
            <button type="button" role="tab" aria-selected={activeTab === "parse"} className={activeTab === "parse" ? "selected" : ""} onClick={() => setActiveTab("parse")}><FileText size={15} />合同解析</button>
            <button type="button" role="tab" aria-selected={activeTab === "chat"} className={activeTab === "chat" ? "selected" : ""} onClick={() => setActiveTab("chat")}><MessageCircle size={15} />实时问答</button>
          </div>

          {activeTab === "risks" ? (
            <div className="contract-risk-panel-content">
              <div className="contract-panel-heading"><div><h3>风险项目</h3><p>点击卡片或“定位原文”，左侧会滚动到对应条款。</p></div><span className="contract-risk-total">{task.risks.length} 项</span></div>
              <div className="contract-risk-filter-summary"><span className="high">高风险 {riskCounts.high}</span><span className="medium">中风险 {riskCounts.medium}</span><span className="low">低风险 {riskCounts.low}</span></div>
              <div className="contract-risk-list">
                {task.risks.length === 0 ? <div className="contract-risk-empty"><CheckCircle2 size={22} /><strong>当前模块未发现风险项</strong><span>人工确认后可以直接入库。</span></div> : null}
                {task.risks.map((risk) => {
                  const selected = risk.id === selectedRiskId;
                  const handled = risk.state !== "open";
                  return (
                    <article className={`contract-risk-card${selected ? " selected" : ""}${handled ? " handled" : ""}`} key={risk.id} onClick={() => setSelectedRiskId(risk.id)}>
                      <div className="contract-risk-card-heading"><Status tone={getContractReviewRiskTone(risk.level)}>{levelLabel(risk.level)}</Status><span>{getContractReviewModuleLabel(risk.moduleId)}</span>{risk.state === "resolved" ? <CheckCircle2 size={15} className="risk-state-icon" /> : risk.state === "ignored" ? <X size={15} className="risk-state-icon ignored" /> : null}</div>
                      <h4>{risk.title}</h4>
                      <p>{risk.summary}</p>
                      {selected ? (
                        <>
                          <div className="contract-risk-evidence"><span>原文依据</span><blockquote>“{risk.originalText}”</blockquote></div>
                          <div className="contract-risk-suggestion"><span>修改建议</span><p>{risk.suggestion}</p></div>
                          {risk.resolution?.reason ? (
                            <div className="contract-risk-suggestion">
                              <span>忽略理由</span>
                              <p>{risk.resolution.reason}</p>
                            </div>
                          ) : null}
                          <div className="contract-risk-actions">
                            <button type="button" className="secondary" onClick={(event) => { event.stopPropagation(); void locateRisk(risk); }}><Highlighter size={13} /> 定位原文</button>
                            {risk.state === "open" ? <>
                              <button type="button" className="primary" disabled={busyRiskId === risk.id} onClick={(event) => { event.stopPropagation(); void updateRisk(risk, "resolved"); }}><Check size={13} /> 应用修改</button>
                              <button type="button" className="contract-ghost-danger" disabled={busyRiskId === risk.id} onClick={(event) => { event.stopPropagation(); setIgnoreRiskId(risk.id); }}>忽略风险</button>
                            </> : <button type="button" className="contract-ghost-button" disabled={busyRiskId === risk.id} onClick={(event) => { event.stopPropagation(); void updateRisk(risk, "open"); }}>撤销处理</button>}
                          </div>
                        </>
                      ) : <button type="button" className="contract-risk-open-button" onClick={(event) => { event.stopPropagation(); setSelectedRiskId(risk.id); }}>查看详情 <ChevronRight size={13} /></button>}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeTab === "parse" ? (
            <div className="contract-parse-panel">
              <div className="contract-panel-heading"><div><h3>合同解析</h3><p>先把合同结构和交易生命周期整理出来，再进入风险核验。</p></div></div>
              <div className="contract-parse-facts"><div><span>合同类型</span><strong>软件技术服务合同</strong></div><div><span>审查立场</span><strong>{contractReviewStanceLabels[task.stance]}</strong></div><div><span>文档结构</span><strong>3 页 · 5 个主要条款</strong></div></div>
              <section className="contract-parse-section"><h4>核心关注</h4><ul><li>数据使用是否超出服务必要范围</li><li>验收是否与付款节点明确衔接</li><li>知识产权是否区分既有能力与定制成果</li><li>终止后删除、迁移和交接是否可执行</li></ul></section>
              <section className="contract-parse-section"><h4>交易生命周期</h4><div className="contract-lifecycle"><span>部署</span><ChevronRight size={13} /><span>数据使用</span><ChevronRight size={13} /><span>验收付款</span><ChevronRight size={13} /><span>退出</span></div></section>
              <section className="contract-parse-section"><h4>已选模块</h4><div className="contract-selected-modules">{task.modules.map((moduleId) => <span key={moduleId}>{getContractReviewModuleLabel(moduleId)}</span>)}</div></section>
            </div>
          ) : null}

          {activeTab === "chat" ? (
            <div className="contract-chat-panel">
              <div className="contract-panel-heading"><div><h3>实时问答</h3><p>问答会引用当前合同原文和风险定位，并标明对应内容来源。</p></div></div>
              <div className="contract-chat-messages" aria-live="polite">
                {messages.map((message) => <div className={`contract-chat-message ${message.role}`} key={message.id}><span className="contract-chat-avatar">{message.role === "assistant" ? <Sparkles size={13} /> : "我"}</span><div><p>{message.text}</p>{message.citation ? <small><Highlighter size={11} /> {message.citation}</small> : null}</div></div>)}
                {chatPending ? <div className="contract-chat-message assistant"><span className="contract-chat-avatar"><Sparkles size={13} /></span><div><p className="contract-chat-typing">正在结合合同原文分析…</p></div></div> : null}
              </div>
              <form className="contract-chat-form" onSubmit={askQuestion}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：第六条为什么是高风险？如何修改？" rows={3} /><button type="submit" className="primary" disabled={!question.trim() || chatPending}><Send size={14} />发送</button></form>
              <div className="contract-chat-suggestions"><button type="button" onClick={() => setQuestion("请解释当前风险的合同依据")}>解释当前风险依据</button><button type="button" onClick={() => setQuestion("请给出当前风险的修改建议")}>给出修改建议</button></div>
            </div>
          ) : null}
        </aside>
      </ContractReviewSplitPane>
      <div className="contract-workbench-footer">
        <span>{feedback ?? (task.status === "preview" ? (editorSession?.provider === "wps" && editorSession.canFinalize ? "当前用户可编辑合同；WPS 自动保存工作副本，点击“保存并生成新版本”后才会生成正式版本。" : "当前合同以只读方式打开；仅上传人或管理员可以编辑并生成新版本。") : task.status === "stored" ? "本合同审查记录已完成入库。" : reportGenerated ? (canStore ? "全部风险已处理，可以入库。" : `还有 ${openRisks.length} 项风险待人工确认。`) : "报告生成后，风险项目和解析结果会在右侧展开。")}</span>
        {reportGenerated && !canStore && task.status !== "stored" ? <span className="contract-footer-hint"><ShieldAlert size={13} /> 应用修改和人工忽略都会写入审计记录</span> : null}
      </div>
      {ignoreRiskId && task ? (
        <Modal
          title="忽略合同风险"
          subtitle="忽略操作将记录操作者、时间和业务理由。"
          onClose={() => {
            setIgnoreRiskId(null);
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
              type="button"
              className="secondary"
              onClick={() => {
                setIgnoreRiskId(null);
                setIgnoreReason("");
              }}
            >
              取消
            </button>
            <button
              type="button"
              className="primary danger-action"
              disabled={!ignoreReason.trim() || busyRiskId === ignoreRiskId}
              onClick={async () => {
                const risk = task.risks.find((item) => item.id === ignoreRiskId);
                if (!risk) return;
                await updateRisk(risk, "ignored", ignoreReason.trim());
                setIgnoreRiskId(null);
                setIgnoreReason("");
              }}
            >
              确认忽略
            </button>
          </div>
        </Modal>
      ) : null}
    </PageStack>
  );
}

function SurfaceLikeLoading() {
  return <div className="contract-loading-panel"><span className="button-spinner" /><p>正在加载合同审查工作台…</p></div>;
}
