import { Check, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";
import { IconButton, Modal, Pagination, Status } from "@/shared/ui";
import type {
  DocumentCategoryCode,
  DocumentLevelCode,
  DocumentTypeCode,
} from "../domain";
import {
  documentCategoryLabels,
  documentLevelLabels,
  documentTypeLabels,
} from "./documentPresentation";

type Stage = "empty" | "pending" | "confirm";
type CandidateState = "classifying" | "awaiting-confirmation" | "confirmed";

interface UploadFile {
  readonly id: string;
  readonly name: string;
  readonly metadata: string;
}

interface ClassificationCandidate {
  readonly id: string;
  readonly name: string;
  readonly type: DocumentTypeCode;
  readonly level: DocumentLevelCode;
  readonly category: DocumentCategoryCode;
  readonly state: CandidateState;
}

type DialogState =
  | { readonly kind: "upload" }
  | { readonly kind: "preview"; readonly entityId: string }
  | null;

const initialFiles: readonly UploadFile[] = [
  { id: "upload_purchase_policy", name: "采购管理办法.docx", metadata: "DOCX · 1.2MB" },
  { id: "upload_project_contract", name: "XX项目合同.pdf", metadata: "PDF · 3.4MB" },
  { id: "upload_compliance_report", name: "年度合规报告.pdf", metadata: "PDF · 2.8MB" },
  { id: "upload_supplier_note", name: "供应商说明.txt", metadata: "TXT · 36KB" },
];

const initialCandidates: readonly ClassificationCandidate[] = [
  { id: "candidate_purchase_policy", name: "采购管理办法（修订稿）.docx", type: "policy", level: "company", category: "procurement", state: "awaiting-confirmation" },
  { id: "candidate_project_contract", name: "XX项目合同.pdf", type: "contract", level: "department", category: "contract", state: "awaiting-confirmation" },
  { id: "candidate_compliance_report", name: "年度合规报告.pdf", type: "report", level: "company", category: "supply-chain", state: "classifying" },
  { id: "candidate_regulations", name: "法律法规汇编.pdf", type: "other", level: "external-standard", category: "external-standard", state: "awaiting-confirmation" },
];

const candidateStatus = {
  classifying: { label: "分类中", tone: "info" },
  "awaiting-confirmation": { label: "待确认", tone: "warning" },
  confirmed: { label: "已确认", tone: "success" },
} as const;

function isLeavingDragTarget(event: DragEvent<HTMLElement>): boolean {
  return (
    event.relatedTarget instanceof Node &&
    event.currentTarget.contains(event.relatedTarget)
  );
}

export function FileClassificationScreen() {
  const [stage, setStage] = useState<Stage>("empty");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [files, setFiles] = useState<readonly UploadFile[]>(initialFiles);
  const [candidates, setCandidates] =
    useState<readonly ClassificationCandidate[]>(initialCandidates);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const previewName = dialog?.kind === "preview"
    ? [...files, ...candidates].find((item) => item.id === dialog.entityId)?.name
    : undefined;

  const updateCandidate = (
    id: string,
    patch: Partial<Omit<ClassificationCandidate, "id">>,
  ) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, ...patch } : candidate,
      ),
    );
  };

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!isLeavingDragTarget(event)) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const feedbackNode = (
    <div className="action-feedback-slot" role="status" aria-live="polite">
      {feedback ? <span className="action-feedback">{feedback}</span> : null}
    </div>
  );

  if (stage === "empty") {
    return (
      <div className="upload-panel">
        <h2>上传待分类文件</h2>
        <p>系统会生成推荐类型、推荐分类、文件层级和人工确认状态。</p>
        <button
          className={`dropzone${isDragging ? " dragging" : ""}`}
          type="button"
          onClick={() => setStage("pending")}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <span className="plus-circle"><Plus /></span>
          <strong>拖拽文件到这里，或点击选择文件</strong>
          <small>支持 PDF / DOCX / XLSX / TXT，最大 50M</small>
          <span className="secondary">选择文件</span>
        </button>
      </div>
    );
  }

  if (stage === "pending") {
    return (
      <>
        <div className="pending-panel">
          <h2>待上传文件</h2>
          <p>文件尚未提交；确认上传后进入分类，完成识别后等待人工确认。</p>
          <div className="pending-grid">
            <button
              className={`pending-drop${isDragging ? " dragging" : ""}`}
              type="button"
              onClick={() => setDialog({ kind: "upload" })}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span className="plus-circle"><Plus /></span>
              <strong>继续拖拽文件到这里</strong>
              <small>支持 PDF / DOCX / XLSX / TXT，最大 50M</small>
              <span className="secondary">继续添加文件</span>
            </button>
            <div className="pending-list">
              <div className="pending-head"><span>文件名</span><span>大小 / 类型</span><span>状态</span><span>操作</span></div>
              {files.length === 0 ? <p className="table-empty">尚未选择文件</p> : null}
              {files.map((file) => (
                <div className="pending-row" key={file.id}>
                  <span><FileText size={17} />{file.name}</span>
                  <span>{file.metadata}</span>
                  <Status>待上传</Status>
                  <span className="actions">
                    <IconButton label={`预览 ${file.name}`} onClick={() => setDialog({ kind: "preview", entityId: file.id })}><Eye /></IconButton>
                    <IconButton
                      label={`删除 ${file.name}`}
                      danger
                      onClick={() => {
                        setFiles((current) => current.filter((item) => item.id !== file.id));
                        setFeedback("文件已移除");
                      }}
                    >
                      <Trash2 />
                    </IconButton>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pending-footer">
            <p>上传前可预览并删除错误文件；删除全部不会影响已上传记录。</p>
            <button
              className="secondary"
              type="button"
              disabled={files.length === 0}
              onClick={() => {
                setFiles([]);
                setFeedback("已清空待上传文件");
              }}
            >
              删除全部
            </button>
            <button
              className="primary"
              type="button"
              disabled={files.length === 0}
              onClick={() => {
                setStage("confirm");
                setFeedback("已进入分类确认流程");
              }}
            >
              确认上传
            </button>
          </div>
          {feedbackNode}
        </div>
        {dialog?.kind === "upload" ? <UploadModal onClose={() => setDialog(null)} onConfirm={() => { setDialog(null); setStage("confirm"); setFeedback("已进入分类确认流程"); }} /> : null}
        {dialog?.kind === "preview" ? <PreviewModal name={previewName} onClose={() => setDialog(null)} /> : null}
      </>
    );
  }

  const classifyingCount = candidates.filter((candidate) => candidate.state === "classifying").length;
  const awaitingCount = candidates.filter((candidate) => candidate.state === "awaiting-confirmation").length;

  return (
    <>
      <div className="stats-row">
        <div><span>待分类总文件</span><strong>{candidates.length}</strong></div>
        <div><span>分类中</span><strong>{classifyingCount}</strong></div>
        <div><span>待确认</span><strong>{awaitingCount}</strong></div>
        <button className="secondary" type="button" onClick={() => setDialog({ kind: "upload" })}>继续上传</button>
      </div>
      <div className="confirm-table">
        <div className="confirm-head"><span>文件名称</span><span>文件类型</span><span>文件层级</span><span>文件分类</span><span>人工确认</span><span>操作</span></div>
        {candidates.map((candidate) => {
          const status = candidateStatus[candidate.state];
          return (
            <div className="confirm-row" key={candidate.id}>
              <input aria-label="文件名称" value={candidate.name} onChange={(event) => updateCandidate(candidate.id, { name: event.target.value })} />
              <select aria-label="文件类型" value={candidate.type} onChange={(event) => updateCandidate(candidate.id, { type: event.target.value as DocumentTypeCode })}>
                {Object.entries(documentTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <select aria-label="文件层级" value={candidate.level} onChange={(event) => updateCandidate(candidate.id, { level: event.target.value as DocumentLevelCode })}>
                {Object.entries(documentLevelLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <select aria-label="文件分类" value={candidate.category} onChange={(event) => updateCandidate(candidate.id, { category: event.target.value as DocumentCategoryCode })}>
                {Object.entries(documentCategoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <Status
                tone={status.tone}
                className={candidate.state === "classifying" ? "status-pulse" : undefined}
              >
                {status.label}
              </Status>
              <span className="actions">
                <IconButton label={`预览 ${candidate.name}`} onClick={() => setDialog({ kind: "preview", entityId: candidate.id })}><Eye /></IconButton>
                <IconButton
                  label={`确认 ${candidate.name}`}
                  disabled={candidate.state === "classifying" || candidate.state === "confirmed"}
                  onClick={() => {
                    updateCandidate(candidate.id, { state: "confirmed" });
                    setFeedback("文件已确认");
                  }}
                >
                  <Check />
                </IconButton>
                <IconButton
                  label={`删除 ${candidate.name}`}
                  danger
                  onClick={() => {
                    setCandidates((current) => current.filter((item) => item.id !== candidate.id));
                    setFeedback("文件已移除");
                  }}
                >
                  <Trash2 />
                </IconButton>
              </span>
            </div>
          );
        })}
      </div>
      <Pagination page={1} pageCount={candidates.length ? 1 : 0} onPageChange={() => undefined} />
      {feedbackNode}
      {dialog?.kind === "upload" ? <UploadModal onClose={() => setDialog(null)} onConfirm={() => { setDialog(null); setFeedback("文件已加入待上传队列"); }} /> : null}
      {dialog?.kind === "preview" ? <PreviewModal name={previewName} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

function UploadModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!isLeavingDragTarget(event)) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  return (
    <Modal title="继续上传文件" subtitle="拖入后先进入待上传队列，确认后进入文件分类。" onClose={onClose}>
      <button
        className={`modal-drop${isDragging ? " dragging" : ""}`}
        type="button"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="plus-circle"><Plus /></span>
        <strong>拖入新文件，或点击加号选择电脑中的文件</strong>
        <small>支持 PDF / DOCX / XLSX / TXT，最大 50M</small>
        <span className="secondary">继续添加</span>
      </button>
      <p className="modal-note">上传成功后进入分类；AI 分类完成后自动出现在待人工确认列表。</p>
      <div className="modal-actions">
        <button className="secondary" type="button">删除全部</button>
        <button className="primary" type="button" onClick={onConfirm}>确认上传</button>
      </div>
    </Modal>
  );
}

function PreviewModal({ name, onClose }: { name?: string; onClose: () => void }) {
  return (
    <Modal title="文件预览" subtitle="只读查看文件内容，不允许编辑原文件。" onClose={onClose}>
      <div className="preview">
        <h3>{name ?? "文件不可用"}</h3>
        <p>第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议；紧急事项应在 3 个工作日内补充备案。</p>
      </div>
    </Modal>
  );
}
