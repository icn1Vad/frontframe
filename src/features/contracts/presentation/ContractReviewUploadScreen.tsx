import { ArrowRight, Check, FileText, Plus, Settings2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/router";
import type { ContractReviewApi } from "../application";
import {
  contractReviewModuleDefinitions,
  contractReviewStanceLabels,
  type ContractReviewModuleId,
  type ContractReviewStance,
} from "../domain";
import { routes } from "../../../app";
import { PageStack, PageToolbar, Status, Surface } from "../../../shared/ui";

export interface ContractReviewUploadScreenProps {
  readonly api: ContractReviewApi;
}

interface PendingContract {
  readonly name: string;
  readonly size: number;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isSupportedContract(file: File): boolean {
  return /\.(docx|pdf)$/i.test(file.name);
}

export function ContractReviewUploadScreen({
  api,
}: ContractReviewUploadScreenProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<PendingContract | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [name, setName] = useState("");
  const [stance, setStance] = useState<ContractReviewStance>("neutral");
  const [modules, setModules] = useState<ContractReviewModuleId[]>([
    "transaction",
    "performance-payment",
    "data-security",
    "intellectual-property",
    "termination",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const addFile = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedContract(file)) {
      setFeedback("合同审查测试页目前只接受 DOCX 或 PDF 文件");
      return;
    }
    setPendingFile({ name: file.name, size: file.size });
    setName(file.name);
    setFeedback(null);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFile(event.dataTransfer.files[0]);
  };

  const toggleModule = (moduleId: ContractReviewModuleId) => {
    setModules((current) =>
      current.includes(moduleId)
        ? current.filter((item) => item !== moduleId)
        : [...current, moduleId],
    );
  };

  const confirmTask = async () => {
    if (!pendingFile || !name.trim() || modules.length === 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.createTask({
        name: name.trim(),
        size: pendingFile.size,
        stance,
        modules,
      });
      await router.push(routes.contractReviewTasks);
    } catch (error) {
      setFeedback(
        error instanceof Error ? `创建审查任务失败：${error.message}` : "创建审查任务失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!pendingFile) {
    return (
      <PageStack>
        <PageToolbar className="contract-page-toolbar">
          <div>
            <div className="contract-eyebrow">CONTRACT REVIEW · TEST FLOW</div>
            <h2>上传待审查合同</h2>
            <p>这是独立的合同审查测试链路，不会改变原来的文件分类审查流程。</p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => void router.push(routes.contractReviewTasks)}
          >
            查看合同任务池 <ArrowRight size={14} />
          </button>
        </PageToolbar>
        <Surface className="contract-upload-card">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".docx,.pdf"
            onChange={handleFileInput}
          />
          <button
            type="button"
            className={`contract-dropzone${isDragging ? " dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={() => setIsDragging(true)}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <span className="contract-dropzone-icon"><UploadCloud size={30} /></span>
            <strong>将合同拖入这里，或点击选择文件</strong>
            <small>支持 DOCX / PDF，单个文件最大 50 MB</small>
            <span className="secondary">选择合同文件</span>
          </button>
          <div className="contract-upload-note">
            <Settings2 size={16} />
            <span>上传后可修改文件名称、审查偏向和检查模块，确认后直接进入合同审查任务池。</span>
          </div>
        </Surface>
        {feedback ? <p className="action-feedback error">{feedback}</p> : null}
      </PageStack>
    );
  }

  return (
    <PageStack>
      <PageToolbar className="contract-page-toolbar">
        <div>
          <div className="contract-eyebrow">CONTRACT REVIEW · CONFIRMATION</div>
          <h2>确认合同审查配置</h2>
          <p>确认后任务会进入合同审查任务池，原文件分类任务池不受影响。</p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => setPendingFile(null)}
          disabled={submitting}
        >
          重新选择文件
        </button>
      </PageToolbar>
      <Surface className="contract-confirm-card">
        <div className="contract-confirm-grid">
          <section className="contract-file-panel">
            <div className="contract-section-heading">
              <div>
                <span className="contract-section-kicker">01 · 文件</span>
                <h3>合同文件</h3>
              </div>
              <Status tone="success">已读取</Status>
            </div>
            <div className="contract-file-row">
              <span className="contract-file-icon"><FileText size={20} /></span>
              <label>
                <span>文件名称</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <span className="contract-file-size">{formatFileSize(pendingFile.size)}</span>
              <button
                type="button"
                className="icon-button contract-remove-file"
                aria-label="移除合同文件"
                onClick={() => setPendingFile(null)}
                disabled={submitting}
              >
                <X size={16} />
              </button>
            </div>
            <div className="contract-confirm-hint">
              <Check size={15} /> 文件仅在本地测试服务中登记元数据，后续接入后端时替换为真实上传接口。
            </div>
          </section>

          <aside className="contract-config-panel">
            <div className="contract-section-heading">
              <div>
                <span className="contract-section-kicker">02 · 审查配置</span>
                <h3>选择审查方式</h3>
              </div>
            </div>
            <label className="contract-field-label">
              <span>审查偏向</span>
              <select value={stance} onChange={(event) => setStance(event.target.value as ContractReviewStance)}>
                {Object.entries(contractReviewStanceLabels).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>
            <fieldset className="contract-module-fieldset">
              <legend>合同审查模块</legend>
              <p>至少选择一个模块，AI 将只按选中的范围生成风险报告。</p>
              <div className="contract-module-options">
                {contractReviewModuleDefinitions.map((module) => (
                  <label key={module.id} className="contract-module-option">
                    <input
                      type="checkbox"
                      checked={modules.includes(module.id)}
                      onChange={() => toggleModule(module.id)}
                    />
                    <span>{module.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </aside>
        </div>
        <div className="contract-confirm-footer">
          <p>{feedback ?? `已选择 ${modules.length} 个检查模块，确认后进入审查任务池。`}</p>
          <button
            type="button"
            className="primary"
            disabled={submitting || !name.trim() || modules.length === 0}
            onClick={() => void confirmTask()}
          >
            {submitting ? <span className="button-spinner" aria-hidden="true" /> : <Plus size={15} />}
            {submitting ? "创建任务中" : "确认并进入任务池"}
          </button>
        </div>
      </Surface>
    </PageStack>
  );
}
