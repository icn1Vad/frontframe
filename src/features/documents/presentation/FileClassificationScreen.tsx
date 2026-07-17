import {
  Check,
  Eye,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { routes } from "@/app/routes";
import {
  BulkActionBar,
  IconButton,
  Modal,
  PageStack,
  PageToolbar,
  Pagination,
  StatGrid,
  Status,
  Surface,
} from "@/shared/ui";
import type {
  ClassificationCandidateQuery,
  ClassificationCandidateRecord,
  ClassificationCandidateState,
  ClassificationCandidateStats,
  ClassificationWorkflowApi,
  ConfirmCandidateInput,
  DocumentPreview,
  PageResult,
} from "../application";
import type {
  ClassificationCandidateId,
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
export type CandidateState = ClassificationCandidateState;
export type ClassificationCandidate = ClassificationCandidateRecord;
export type CandidateSaveState = "clean" | "dirty" | "saving" | "error";

interface UploadFile {
  readonly id: string;
  readonly name: string;
  readonly metadata: string;
  readonly file?: File;
}

interface CandidateFilters {
  readonly type: DocumentTypeCode | "";
  readonly level: DocumentLevelCode | "";
  readonly category: DocumentCategoryCode | "";
  readonly state: ClassificationCandidateState | "";
}

export interface FileClassificationScreenProps {
  readonly api: ClassificationWorkflowApi;
  readonly useDemoInitialFiles?: boolean;
}

type DialogState =
  | { readonly kind: "preview"; readonly entityId: string }
  | { readonly kind: "bulk-confirm" }
  | {
      readonly kind: "delete";
      readonly candidateIds: readonly ClassificationCandidateId[];
    }
  | null;

const initialFiles: readonly UploadFile[] = [
  { id: "upload_purchase_policy", name: "采购管理办法.docx", metadata: "文字文档 · 1.2 兆字节" },
  { id: "upload_project_contract", name: "星河项目服务合同.pdf", metadata: "便携文档 · 3.4 兆字节" },
  { id: "upload_compliance_report", name: "年度合规报告.pdf", metadata: "便携文档 · 2.8 兆字节" },
  { id: "upload_supplier_note", name: "供应商说明.txt", metadata: "纯文本 · 36 千字节" },
];

const emptyStats: ClassificationCandidateStats = {
  total: 0,
  classifying: 0,
  awaitingConfirmation: 0,
};

const emptyResult: PageResult<ClassificationCandidateRecord> = {
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
  pageCount: 0,
};

const initialFilters: CandidateFilters = {
  type: "",
  level: "",
  category: "",
  state: "",
};

const candidateStatus = {
  classifying: { label: "分类中", tone: "info" },
  "awaiting-confirmation": { label: "待确认", tone: "warning" },
} as const;

const candidateSaveStatus: Record<
  CandidateSaveState,
  { readonly label: string; readonly className: string }
> = {
  clean: { label: "未修改", className: "clean" },
  dirty: { label: "有未保存修改", className: "dirty" },
  saving: { label: "提交中…", className: "saving" },
  error: { label: "操作失败", className: "error" },
};

function isLeavingDragTarget(event: DragEvent<HTMLElement>): boolean {
  return (
    event.relatedTarget instanceof Node &&
    event.currentTarget.contains(event.relatedTarget)
  );
}

function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positivePage(value: string): number {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function idempotencyKey(prefix: string): string {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function formatFileSize(file: File): string {
  const size = file.size >= 1024 * 1024
    ? `${(file.size / (1024 * 1024)).toFixed(1)} 兆字节`
    : `${Math.max(1, Math.round(file.size / 1024))} 千字节`;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fileType = {
    pdf: "便携文档",
    docx: "文字文档",
    txt: "纯文本",
    md: "Markdown",
  }[extension] ?? "文件";
  return `${fileType} · ${size}`;
}

export function FileClassificationScreen({
  api,
  useDemoInitialFiles = true,
}: FileClassificationScreenProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const initializedFromUrl = useRef(false);
  const [stage, setStage] = useState<Stage>("empty");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [files, setFiles] = useState<readonly UploadFile[]>(
    useDemoInitialFiles ? initialFiles : [],
  );
  const [result, setResult] =
    useState<PageResult<ClassificationCandidateRecord>>(emptyResult);
  const [stats, setStats] = useState<ClassificationCandidateStats>(emptyStats);
  const [filters, setFilters] = useState<CandidateFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<ClassificationCandidateId>>(
    () => new Set(),
  );
  const [saveStates, setSaveStates] =
    useState<Record<string, CandidateSaveState>>({});
  const [failureMessages, setFailureMessages] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<Set<ClassificationCandidateId>>(
    () => new Set(),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [candidatePreview, setCandidatePreview] =
    useState<DocumentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || initializedFromUrl.current) return;
    initializedFromUrl.current = true;
    setFilters({
      type: queryValue(router.query.type) as CandidateFilters["type"],
      level: queryValue(router.query.level) as CandidateFilters["level"],
      category: queryValue(router.query.category) as CandidateFilters["category"],
      state: queryValue(router.query.status) as CandidateFilters["state"],
    });
    setPage(positivePage(queryValue(router.query.page)));
  }, [router.isReady, router.query]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    const query: ClassificationCandidateQuery = {
      page,
      pageSize: 10,
      types: filters.type ? [filters.type] : undefined,
      levels: filters.level ? [filters.level] : undefined,
      categories: filters.category ? [filters.category] : undefined,
      states: filters.state ? [filters.state] : undefined,
    };
    try {
      const [nextResult, nextStats] = await Promise.all([
        api.listCandidates(query),
        api.getStats(),
      ]);
      setResult(nextResult);
      setStats(nextStats);
      setSaveStates((current) => {
        const next = { ...current };
        for (const candidate of nextResult.items) next[candidate.id] ??= "clean";
        return next;
      });
    } catch (error) {
      setFeedback(error instanceof Error ? `加载失败：${error.message}` : "加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [api, filters, page]);

  useEffect(() => {
    if (!initializedFromUrl.current && router.isReady) return;
    void loadCandidates();
  }, [loadCandidates, router.isReady]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters, page]);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const currentCandidates = result.items;
  const currentIds = useMemo(
    () => currentCandidates.map((candidate) => candidate.id),
    [currentCandidates],
  );
  const selectedCandidates = useMemo(
    () => currentCandidates.filter((candidate) => selectedIds.has(candidate.id)),
    [currentCandidates, selectedIds],
  );
  const allSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.has(id));
  const partlySelected = !allSelected && currentIds.some((id) => selectedIds.has(id));

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partlySelected;
  }, [partlySelected]);

  const previewName = dialog?.kind === "preview"
    ? [...files, ...currentCandidates].find((item) => item.id === dialog.entityId)?.name
    : undefined;

  const syncUrl = (
    nextFilters: CandidateFilters,
    nextPage: number,
  ) => {
    void router.replace(
      {
        pathname: routes.fileClassification,
        query: {
          ...(nextFilters.type ? { type: nextFilters.type } : {}),
          ...(nextFilters.level ? { level: nextFilters.level } : {}),
          ...(nextFilters.category ? { category: nextFilters.category } : {}),
          ...(nextFilters.state ? { status: nextFilters.state } : {}),
          ...(nextPage > 1 ? { page: nextPage } : {}),
        },
      },
      undefined,
      { shallow: true },
    );
  };

  const updateFilter = <K extends keyof CandidateFilters>(
    key: K,
    value: CandidateFilters[K],
  ) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    syncUrl(next, 1);
  };

  const updateCandidate = (
    id: ClassificationCandidateId,
    patch: Partial<Pick<ClassificationCandidateRecord, "name" | "type" | "level" | "category">>,
  ) => {
    setResult((current) => ({
      ...current,
      items: current.items.map((candidate) =>
        candidate.id === id ? { ...candidate, ...patch } : candidate,
      ),
    }));
    setSaveStates((current) => ({ ...current, [id]: "dirty" }));
    setFailureMessages((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const removeSucceeded = (ids: ReadonlySet<ClassificationCandidateId>) => {
    setResult((current) => {
      const items = current.items.filter((candidate) => !ids.has(candidate.id));
      const total = Math.max(0, current.total - ids.size);
      return {
        ...current,
        items,
        total,
        pageCount: total === 0 ? 0 : Math.ceil(total / current.pageSize),
      };
    });
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  };

  const refreshStats = async () => setStats(await api.getStats());

  const confirmCandidates = async (
    candidates: readonly ClassificationCandidateRecord[],
  ) => {
    if (candidates.length === 0) return;
    const ids = new Set(candidates.map((candidate) => candidate.id));
    setPendingIds((current) => new Set([...current, ...ids]));
    setSaveStates((current) => {
      const next = { ...current };
      for (const id of ids) next[id] = "saving";
      return next;
    });
    setDialog(null);
    try {
      const inputs: readonly ConfirmCandidateInput[] = candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        type: candidate.type,
        level: candidate.level,
        category: candidate.category,
        expectedVersion: candidate.version,
        manualOverride: candidate.state === "classifying",
      }));
      const response = await api.confirmCandidates(inputs, {
        idempotencyKey: idempotencyKey("confirm-candidates"),
      });
      const succeededIds = new Set(
        response.succeeded.map((item) => item.candidateId),
      );
      removeSucceeded(succeededIds);
      setFailureMessages((current) => {
        const next = { ...current };
        for (const failure of response.failed) next[failure.id] = failure.message;
        return next;
      });
      setSaveStates((current) => {
        const next = { ...current };
        for (const id of ids) next[id] = succeededIds.has(id) ? "clean" : "error";
        return next;
      });
      setSelectedIds(new Set(response.failed.map((failure) => failure.id as ClassificationCandidateId)));
      await refreshStats();
      if (response.failed.length) {
        setFeedback(
          `已确认 ${response.succeeded.length} 项，${response.failed.length} 项失败并保留在列表中`,
        );
      } else {
        setFeedback(`已确认 ${response.succeeded.length} 项，正在进入分类任务池`);
        await router.push(routes.classificationTasks);
      }
    } catch (error) {
      setSaveStates((current) => {
        const next = { ...current };
        for (const id of ids) next[id] = "error";
        return next;
      });
      setFeedback(error instanceof Error ? `确认失败：${error.message}` : "确认失败，请稍后重试");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  };

  const deleteCandidates = async (
    candidateIds: readonly ClassificationCandidateId[],
  ) => {
    const candidates = currentCandidates.filter((item) => candidateIds.includes(item.id));
    if (candidates.length === 0) return;
    const ids = new Set(candidates.map((candidate) => candidate.id));
    setPendingIds((current) => new Set([...current, ...ids]));
    setDialog(null);
    try {
      const response = await api.softDeleteCandidates(
        candidates.map((candidate) => ({
          id: candidate.id,
          expectedVersion: candidate.version,
        })),
        { idempotencyKey: idempotencyKey("delete-candidates") },
      );
      const succeededIds = new Set(response.succeeded.map((item) => item.id));
      removeSucceeded(succeededIds);
      setFailureMessages((current) => {
        const next = { ...current };
        for (const failure of response.failed) next[failure.id] = failure.message;
        return next;
      });
      setSelectedIds(new Set(response.failed.map((failure) => failure.id as ClassificationCandidateId)));
      await refreshStats();
      setFeedback(
        response.failed.length
          ? `已删除 ${response.succeeded.length} 项，${response.failed.length} 项失败`
          : `已删除 ${response.succeeded.length} 项`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? `删除失败：${error.message}` : "删除失败，请稍后重试");
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  };

  const addFiles = (fileList: FileList | readonly File[]) => {
    const additions = Array.from(fileList).map<UploadFile>((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      name: file.name,
      metadata: formatFileSize(file),
      file,
    }));
    if (additions.length === 0) return;
    setFiles((current) => [...current, ...additions]);
    setStage("pending");
    setFeedback(`已添加 ${additions.length} 个文件到待上传列表`);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

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
    addFiles(event.dataTransfer.files);
  };

  const confirmPendingUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const browserFiles = files.flatMap((item) => (item.file ? [item.file] : []));
      if (browserFiles.length) {
        await api.uploadFiles(browserFiles, {
          idempotencyKey: idempotencyKey("upload-files"),
        });
      }
      setFiles([]);
      setStage("confirm");
      setPage(1);
      await loadCandidates();
      setFeedback("文件已提交，正在进行智能分类");
    } catch (error) {
      setFeedback(error instanceof Error ? `上传失败：${error.message}` : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(currentIds));
  };

  const toggleOne = (id: ClassificationCandidateId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCandidatePreview = async (
    candidate: ClassificationCandidateRecord,
  ) => {
    setCandidatePreview(null);
    setPreviewLoading(true);
    setDialog({ kind: "preview", entityId: candidate.id });
    try {
      setCandidatePreview(await api.getPreview(candidate.id));
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? `预览失败：${error.message}`
          : "预览失败，请稍后重试",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const feedbackNode = (
    <div className="action-feedback-slot" role="status" aria-live="polite">
      {feedback ? (
        <span className={`action-feedback${feedback.includes("失败") ? " error" : ""}`}>
          {feedback}
        </span>
      ) : null}
    </div>
  );

  const fileInput = (
    <input
      ref={fileInputRef}
      className="visually-hidden"
      type="file"
      accept=".pdf,.docx,.txt,.md"
      multiple
      onChange={handleFileInput}
    />
  );

  if (stage === "empty") {
    return (
      <PageStack>
        <Surface className="upload-panel">
          <h2>上传待分类文件</h2>
          <p>系统会生成推荐类型、推荐分类、文件层级和人工确认状态。</p>
          {fileInput}
          <button
            className={`dropzone${isDragging ? " dragging" : ""}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className="plus-circle"><Plus /></span>
            <strong>拖拽文件到这里，或点击选择文件</strong>
            <small>支持 PDF、DOCX、TXT 和 Markdown，最大 50 兆字节</small>
            <span className="secondary">选择文件</span>
          </button>
          <div className="upload-entry-actions">
            <button
              className="secondary"
              type="button"
              onClick={() => setStage("confirm")}
            >
              查看待确认文件
            </button>
          </div>
        </Surface>
        {feedbackNode}
      </PageStack>
    );
  }

  if (stage === "pending") {
    return (
      <PageStack>
        <Surface className="pending-panel">
          <h2>待上传文件</h2>
          <p>文件尚未提交；确认上传后进入分类，并等待人工确认。</p>
          {fileInput}
          <div className="pending-grid">
            <button
              className={`pending-drop${isDragging ? " dragging" : ""}`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <span className="plus-circle"><Plus /></span>
              <strong>继续拖拽文件到这里</strong>
              <small>支持 PDF、DOCX、TXT 和 Markdown，最大 50 兆字节</small>
              <span className="secondary">继续添加文件</span>
            </button>
            <div className="pending-list">
              <div className="pending-head">
                <span>文件名</span><span>大小 / 类型</span><span>状态</span><span>操作</span>
              </div>
              {files.length === 0 ? <p className="table-empty">尚未选择文件</p> : null}
              {files.map((file) => (
                <div className="pending-row" key={file.id}>
                  <span><FileText size={17} />{file.name}</span>
                  <span>{file.metadata}</span>
                  <Status>待上传</Status>
                  <span className="actions touch-actions">
                    <IconButton
                      label={`预览 ${file.name}`}
                      onClick={() => setDialog({ kind: "preview", entityId: file.id })}
                    >
                      <Eye />
                    </IconButton>
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
            <p>上传前可预览并删除错误文件；不会影响已进入分类流程的文件。</p>
            <button
              className="secondary"
              type="button"
              disabled={files.length === 0 || uploading}
              onClick={() => setFiles([])}
            >
              删除全部
            </button>
            <button
              className="primary"
              type="button"
              disabled={files.length === 0 || uploading}
              onClick={() => void confirmPendingUpload()}
            >
              {uploading ? <span className="button-spinner" aria-hidden="true" /> : null}
              {uploading ? "上传中…" : "确认上传"}
            </button>
          </div>
        </Surface>
        {feedbackNode}
        {dialog?.kind === "preview" ? (
          <PreviewModal name={previewName} onClose={() => setDialog(null)} />
        ) : null}
      </PageStack>
    );
  }

  const classifyingSelected = selectedCandidates.filter(
    (candidate) => candidate.state === "classifying",
  ).length;
  const deletingCandidates = dialog?.kind === "delete"
    ? currentCandidates.filter((candidate) => dialog.candidateIds.includes(candidate.id))
    : [];

  return (
    <PageStack>
      <section className="classification-summary" aria-labelledby="classification-heading">
        <PageToolbar className="classification-toolbar">
          <div>
            <h2 id="classification-heading">分类确认</h2>
            <p>推荐结果均可修改；确认后进入分类任务池，再选择直接入库或开始审查。</p>
          </div>
          <button className="secondary" type="button" onClick={() => setStage("pending")}>
            继续上传
          </button>
        </PageToolbar>
        <StatGrid className="stats-row">
          <Surface><span>待分类总文件</span><strong>{stats.total}</strong></Surface>
          <Surface><span>分类中</span><strong>{stats.classifying}</strong></Surface>
          <Surface><span>待确认</span><strong>{stats.awaitingConfirmation}</strong></Surface>
        </StatGrid>
      </section>

      <section className="classification-list-section">
        <PageToolbar className="classification-filters" aria-label="文件分类筛选">
          <label>
            <span>文件类型</span>
            <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value as CandidateFilters["type"])}>
              <option value="">全部类型</option>
              {Object.entries(documentTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>文件层级</span>
            <select value={filters.level} onChange={(event) => updateFilter("level", event.target.value as CandidateFilters["level"])}>
              <option value="">全部层级</option>
              {Object.entries(documentLevelLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>文件分类</span>
            <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value as CandidateFilters["category"])}>
              <option value="">全部分类</option>
              {Object.entries(documentCategoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>确认状态</span>
            <select value={filters.state} onChange={(event) => updateFilter("state", event.target.value as CandidateFilters["state"])}>
              <option value="">全部状态</option>
              <option value="classifying">分类中</option>
              <option value="awaiting-confirmation">待确认</option>
            </select>
          </label>
        </PageToolbar>

        <BulkActionBar selectedCount={selectedIds.size}>
          <strong>已选择 {selectedIds.size} 项</strong>
          <span>仅选择当前页</span>
          <button
            className="primary"
            type="button"
            disabled={selectedIds.size === 0 || pendingIds.size > 0}
            onClick={() => setDialog({ kind: "bulk-confirm" })}
          >
            <Check size={15} />批量确认
          </button>
          <button
            className="secondary danger-action"
            type="button"
            disabled={selectedIds.size === 0 || pendingIds.size > 0}
            onClick={() => setDialog({ kind: "delete", candidateIds: [...selectedIds] })}
          >
            <Trash2 size={15} />批量删除
          </button>
        </BulkActionBar>

        <Surface className="confirm-table" aria-busy={loading}>
          <div className="confirm-head">
            <span className="selection-cell">
              <input
                ref={selectAllRef}
                type="checkbox"
                aria-label="选择当前页全部文件"
                checked={allSelected}
                disabled={currentIds.length === 0 || loading}
                onChange={toggleAll}
              />
            </span>
            <span>文件名称 / 保存状态</span><span>文件类型</span><span>文件层级</span>
            <span>文件分类</span><span>人工确认</span><span>操作</span>
          </div>
          {loading ? <p className="table-empty">正在加载分类文件…</p> : null}
          {!loading && currentCandidates.length === 0 ? (
            <p className="table-empty">当前筛选条件下暂无待确认文件</p>
          ) : null}
          {!loading && currentCandidates.map((candidate) => {
            const workflowStatus = candidateStatus[candidate.state];
            const saveState = saveStates[candidate.id] ?? "clean";
            const saveStatus = candidate.state === "classifying" && saveState === "clean"
              ? { label: "智能分类中，可人工覆盖", className: "clean" }
              : candidateSaveStatus[saveState];
            const pending = pendingIds.has(candidate.id);
            return (
              <div className={`confirm-row${pending ? " pending" : ""}`} key={candidate.id}>
                <span className="selection-cell">
                  <input
                    type="checkbox"
                    aria-label={`选择 ${candidate.name}`}
                    checked={selectedIds.has(candidate.id)}
                    disabled={pending}
                    onChange={() => toggleOne(candidate.id)}
                  />
                </span>
                <span className="candidate-name-field">
                  <input
                    aria-label={`文件名称：${candidate.name}`}
                    value={candidate.name}
                    disabled={pending}
                    onChange={(event) => updateCandidate(candidate.id, { name: event.target.value })}
                  />
                  <small className={`candidate-save-state ${saveStatus.className}`} title={failureMessages[candidate.id]} aria-live="polite">
                    {failureMessages[candidate.id] ?? saveStatus.label}
                  </small>
                </span>
                <select aria-label={`${candidate.name} 文件类型`} value={candidate.type} disabled={pending} onChange={(event) => updateCandidate(candidate.id, { type: event.target.value as DocumentTypeCode })}>
                  {Object.entries(documentTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <select aria-label={`${candidate.name} 文件层级`} value={candidate.level} disabled={pending} onChange={(event) => updateCandidate(candidate.id, { level: event.target.value as DocumentLevelCode })}>
                  {Object.entries(documentLevelLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <select aria-label={`${candidate.name} 文件分类`} value={candidate.category} disabled={pending} onChange={(event) => updateCandidate(candidate.id, { category: event.target.value as DocumentCategoryCode })}>
                  {Object.entries(documentCategoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <Status tone={workflowStatus.tone} className={candidate.state === "classifying" ? "status-pulse" : undefined}>
                  {workflowStatus.label}
                </Status>
                <span className="actions touch-actions">
                  <IconButton label={`预览 ${candidate.name}`} disabled={pending} onClick={() => void openCandidatePreview(candidate)}>
                    <Eye />
                  </IconButton>
                  <IconButton label={`确认 ${candidate.name}`} disabled={pending} onClick={() => void confirmCandidates([candidate])}>
                    {pending ? <span className="button-spinner" aria-hidden="true" /> : <Check />}
                  </IconButton>
                  <IconButton label={`删除 ${candidate.name}`} danger disabled={pending} onClick={() => setDialog({ kind: "delete", candidateIds: [candidate.id] })}>
                    <Trash2 />
                  </IconButton>
                </span>
              </div>
            );
          })}
        </Surface>
        <Pagination
          page={result.page}
          pageCount={result.pageCount}
          disabled={loading || pendingIds.size > 0}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            syncUrl(filters, nextPage);
          }}
        />
      </section>
      {feedbackNode}

      {dialog?.kind === "preview" ? (
        <PreviewModal
          name={candidatePreview?.documentName ?? previewName}
          content={candidatePreview?.content}
          loading={previewLoading}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "bulk-confirm" ? (
        <Modal
          title="确认所选分类结果"
          subtitle={`将确认 ${selectedCandidates.length} 个文件，其中 ${classifyingSelected} 个仍在智能分类中。`}
          onClose={() => setDialog(null)}
        >
          <p className="dialog-copy">
            分类中的文件会采用当前人工填写结果；后续智能分类结果将被忽略。全部确认成功后会进入分类任务池，但不会自动入库或自动进入审查。
          </p>
          <div className="modal-actions">
            <button className="secondary" type="button" onClick={() => setDialog(null)}>取消</button>
            <button className="primary" type="button" onClick={() => void confirmCandidates(selectedCandidates)}>确认 {selectedCandidates.length} 项</button>
          </div>
        </Modal>
      ) : null}
      {dialog?.kind === "delete" ? (
        <Modal
          title={deletingCandidates.length > 1 ? "批量删除文件" : "删除文件"}
          subtitle={`将软删除 ${deletingCandidates.length} 个文件，审计记录仍会保留。`}
          onClose={() => setDialog(null)}
        >
          <p className="dialog-copy">
            {deletingCandidates.slice(0, 3).map((candidate) => candidate.name).join("、")}
            {deletingCandidates.length > 3 ? ` 等 ${deletingCandidates.length} 个文件` : ""}
          </p>
          <div className="modal-actions">
            <button className="secondary" type="button" onClick={() => setDialog(null)}>取消</button>
            <button className="primary danger-action" type="button" onClick={() => void deleteCandidates(dialog.candidateIds)}>确认删除</button>
          </div>
        </Modal>
      ) : null}
    </PageStack>
  );
}

function PreviewModal({
  name,
  content,
  loading = false,
  onClose,
}: {
  name?: string;
  content?: string;
  loading?: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      title="文件预览"
      subtitle="只读查看文件内容，不允许编辑原文件。"
      onClose={onClose}
    >
      <div className="preview">
        <h3>{name ?? "文件不可用"}</h3>
        <p>
          {loading
            ? "正在加载预览…"
            : content ??
              "第十二条 审批权限：采购金额超过 500 万元时，由采购管理部提交董事会审议；紧急事项应在 3 个工作日内补充备案。"}
        </p>
      </div>
    </Modal>
  );
}
