import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/shared/ui";
import type { DocumentId, DocumentSummary } from "../domain";
import type { DocumentDialogState } from "./documentActions";

export interface DocumentDialogHostProps {
  state: DocumentDialogState;
  documents: readonly DocumentSummary[];
  onClose: () => void;
  onDelete?: (documentId: DocumentId) => void | Promise<void>;
  renderPreview?: (document: DocumentSummary) => ReactNode;
}

export function DocumentDialogHost({
  state,
  documents,
  onClose,
  onDelete,
  renderPreview,
}: DocumentDialogHostProps) {
  const [submitting, setSubmitting] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const document = state
    ? documents.find((candidate) => candidate.id === state.documentId)
    : undefined;

  useEffect(() => {
    setSubmitting(false);
    setMutationError(null);
  }, [state]);

  if (!state) return null;

  if (!document) {
    return (
      <Modal title="对象不可用" onClose={onClose}>
        <p className="dialog-copy">该文件已不在当前数据集中，请刷新后重试。</p>
      </Modal>
    );
  }

  if (state.kind === "preview") {
    return (
      <Modal
        title="文件预览"
        subtitle={`只读查看：${document.name}`}
        onClose={onClose}
      >
        {renderPreview ? (
          renderPreview(document)
        ) : (
          <div className="preview">
            <h3>{document.name}</h3>
            <p>预览内容由文档预览适配器提供。</p>
          </div>
        )}
      </Modal>
    );
  }

  if (state.kind === "progress") {
    const progress = document.state.kind === "reviewing"
      ? document.state.progress
      : 100;
    return (
      <Modal
        title="审查进度"
        subtitle={`当前文件：${document.name}`}
        onClose={onClose}
      >
        <div className="progress-list">
          <div>
            <span>总体进度</span>
            <i>
              <b style={{ width: `${progress}%` }} />
            </i>
            <span>{progress}%</span>
          </div>
        </div>
      </Modal>
    );
  }

  const handleDelete = async () => {
    if (!onDelete) return;
    setSubmitting(true);
    setMutationError(null);
    try {
      await onDelete(document.id);
      onClose();
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "删除失败，请稍后重试。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="确认删除"
      subtitle={`将软删除“${document.name}”，审计记录仍会保留。`}
      onClose={onClose}
    >
      {mutationError ? <p role="alert">{mutationError}</p> : null}
      <div className="modal-actions">
        <button
          type="button"
          className="secondary"
          disabled={!onDelete || submitting}
          onClick={handleDelete}
        >
          {submitting ? <span className="button-spinner" aria-hidden="true" /> : null}
          {submitting ? "删除中…" : "删除"}
        </button>
        <button type="button" className="primary" onClick={onClose}>
          取消
        </button>
      </div>
    </Modal>
  );
}
