import { ArrowRight, Check, FileText, Plus, UploadCloud, X } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/router";
import type { ContractReviewApi, UploadedContractDocument } from "../application";
import { contractReviewModuleDefinitions } from "../domain";
import { routes } from "../../../app";
import { createIdempotencyKey } from "../../../shared/lib/idempotency";
import { PageStack, PageToolbar, Status, Surface } from "../../../shared/ui";

export interface ContractReviewUploadScreenProps {
  readonly api: ContractReviewApi;
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} 字节`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} 千字节`;
  return `${(size / 1024 / 1024).toFixed(1)} 兆字节`;
}

function isSupportedDocument(file: File): boolean {
  return /\.(docx|pdf)$/i.test(file.name);
}

export function ContractReviewUploadScreen({ api }: ContractReviewUploadScreenProps) {
  const router = useRouter();
  const contractInputRef = useRef<HTMLInputElement>(null);
  const policyInputRef = useRef<HTMLInputElement>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [policyFiles, setPolicyFiles] = useState<readonly File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const setContract = (file: File | undefined) => {
    if (!file) return;
    if (!isSupportedDocument(file)) {
      setFeedback("合同文件仅支持 .docx 或 .pdf");
      return;
    }
    setContractFile(file);
    setFeedback(null);
  };

  const addPolicies = (files: FileList | readonly File[]) => {
    const incoming = Array.from(files);
    if (incoming.some((file) => !isSupportedDocument(file))) {
      setFeedback("制度依据仅支持 .docx 或 .pdf");
      return;
    }
    setPolicyFiles((current) => {
      const unique = [...current];
      for (const file of incoming) {
        if (!unique.some((item) => item.name === file.name && item.size === file.size)) unique.push(file);
      }
      if (unique.length > 20) {
        setFeedback("制度依据最多选择 20 份");
        return unique.slice(0, 20);
      }
      setFeedback(null);
      return unique;
    });
  };

  const handleContractInput = (event: ChangeEvent<HTMLInputElement>) => {
    setContract(event.target.files?.[0]);
    event.target.value = "";
  };

  const handlePolicyInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addPolicies(event.target.files);
    event.target.value = "";
  };

  const handleContractDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    setContract(event.dataTransfer.files[0]);
  };

  const confirmTask = async () => {
    if (!contractFile || policyFiles.length < 1 || policyFiles.length > 20) return;
    setSubmitting(true);
    setFeedback("正在上传合同文件…");
    try {
      const contract = await api.uploadDocument(contractFile, "CONTRACT", {
        idempotencyKey: createIdempotencyKey("upload-contract-document"),
      });
      const policies: UploadedContractDocument[] = [];
      for (let index = 0; index < policyFiles.length; index += 1) {
        setFeedback(`正在上传制度依据（${index + 1}/${policyFiles.length}）…`);
        policies.push(await api.uploadDocument(policyFiles[index], "POLICY", {
          idempotencyKey: createIdempotencyKey("upload-contract-policy"),
        }));
      }
      setFeedback("文件上传完成，正在创建合同审查任务…");
      const createdTask = await api.createTask({
        contractFileId: contract.fileId,
        policyFileIds: policies.map((policy) => policy.fileId),
        name: contract.fileName,
        size: contract.size,
        stance: "neutral",
        modules: contractReviewModuleDefinitions.map((module) => module.id),
      }, {
        idempotencyKey: createIdempotencyKey("create-contract-review"),
      });
      await router.push(routes.contractReviewTask(createdTask.id));
    } catch (error) {
      setFeedback(error instanceof Error ? `开始审查失败：${error.message}` : "开始审查失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageStack>
      <PageToolbar className="contract-page-toolbar">
        <div>
          <div className="contract-eyebrow">合同专项审查</div>
          <h2>上传待审查合同</h2>
          <p>上传 1 份合同和 1–20 份制度依据，系统将按制度要求自动审查合同条款。</p>
          <p>DOCX 可在工作台连接 WPS 在线编辑；PDF 使用文本预览与风险报告。</p>
        </div>
        <button type="button" className="secondary" onClick={() => void router.push(routes.contractReviewTasks)}>
          查看合同任务池 <ArrowRight size={14} />
        </button>
      </PageToolbar>

      <Surface className="contract-confirm-card">
        <div className="contract-confirm-grid">
          <section className="contract-file-panel">
            <div className="contract-section-heading">
              <div><span className="contract-section-kicker">01 · 合同</span><h3>待审查合同</h3></div>
              {contractFile ? <Status tone="success">已选择</Status> : <Status tone="neutral">必选 1 份</Status>}
            </div>
            <input ref={contractInputRef} className="visually-hidden" type="file" accept=".docx,.pdf" onChange={handleContractInput} />
            {contractFile ? (
              <div className="contract-file-row">
                <span className="contract-file-icon"><FileText size={20} /></span>
                <span><strong>{contractFile.name}</strong><small>{formatFileSize(contractFile.size)}</small></span>
                <button type="button" className="icon-button contract-remove-file" aria-label="移除合同文件" onClick={() => setContractFile(null)} disabled={submitting}><X size={16} /></button>
              </div>
            ) : (
              <button
                type="button"
                className={`contract-dropzone${isDragging ? " dragging" : ""}`}
                onClick={() => contractInputRef.current?.click()}
                onDragEnter={() => setIsDragging(true)}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleContractDrop}
              >
                <span className="contract-dropzone-icon"><UploadCloud size={28} /></span>
                <strong>拖入合同，或点击选择文件</strong>
                <small>支持 .docx、.pdf</small>
              </button>
            )}
          </section>

          <aside className="contract-config-panel">
            <div className="contract-section-heading">
              <div><span className="contract-section-kicker">02 · 审查依据</span><h3>制度文件</h3></div>
              <Status tone={policyFiles.length > 0 ? "success" : "neutral"}>{policyFiles.length}/20</Status>
            </div>
            <input ref={policyInputRef} className="visually-hidden" type="file" accept=".docx,.pdf" multiple onChange={handlePolicyInput} />
            <button type="button" className="secondary" onClick={() => policyInputRef.current?.click()} disabled={submitting || policyFiles.length >= 20}>
              <Plus size={15} /> 添加制度依据
            </button>
            <div className="contract-module-options">
              {policyFiles.length === 0 ? <p>至少添加 1 份制度文件，最多 20 份。</p> : null}
              {policyFiles.map((file, index) => (
                <div className="contract-file-row" key={`${file.name}-${file.size}`}>
                  <span className="contract-file-icon"><FileText size={17} /></span>
                  <span><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></span>
                  <button type="button" className="icon-button contract-remove-file" aria-label={`移除制度文件 ${file.name}`} onClick={() => setPolicyFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={submitting}><X size={15} /></button>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="contract-confirm-footer">
          <p>{feedback ?? (contractFile && policyFiles.length > 0 ? <><Check size={15} /> 文件已就绪，可开始自动审查。</> : "请选择合同和制度依据。")}</p>
          <button type="button" className="primary" disabled={submitting || !contractFile || policyFiles.length < 1} onClick={() => void confirmTask()}>
            {submitting ? <span className="button-spinner" aria-hidden="true" /> : <Plus size={15} />}
            {submitting ? "正在创建任务" : "开始审查"}
          </button>
        </div>
      </Surface>
    </PageStack>
  );
}
