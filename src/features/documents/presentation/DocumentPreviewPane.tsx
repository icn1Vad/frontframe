import { useEffect, useState } from "react";
import type {
  DocumentPreview,
  RepositoryRequestOptions,
} from "../application";
import type { DocumentId } from "../domain";

export interface DocumentPreviewPaneProps {
  readonly documentId: DocumentId;
  readonly fallbackName: string;
  readonly loadPreview: (
    documentId: DocumentId,
    options?: RepositoryRequestOptions,
  ) => Promise<DocumentPreview | null>;
}

export function DocumentPreviewPane({
  documentId,
  fallbackName,
  loadPreview,
}: DocumentPreviewPaneProps) {
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPreview(null);
    setLoading(true);
    setError(null);
    void loadPreview(documentId, { signal: controller.signal })
      .then(setPreview)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "文件预览加载失败，请稍后重试。",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [documentId, loadPreview]);

  if (loading) return <p className="table-state">正在加载文件预览…</p>;
  if (error) return <p className="table-state" role="alert">{error}</p>;
  if (!preview) return <p className="table-state">当前文件暂无可用预览。</p>;

  return (
    <div className="preview">
      <h3>{preview.documentName || fallbackName}</h3>
      <p>{preview.content}</p>
    </div>
  );
}
