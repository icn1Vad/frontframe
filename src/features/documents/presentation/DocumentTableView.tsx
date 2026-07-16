import { useEffect, useState, type ReactNode } from "react";
import { DataGrid, type DataGridColumn } from "@/shared/table";
import { Pagination, type PaginationProps } from "@/shared/ui";
import type { DocumentId, DocumentSummary } from "../domain";
import {
  DocumentActionCell,
  type DocumentActionDefinition,
  type DocumentCommandHandlers,
  type DocumentDialogState,
} from "./documentActions";
import { DocumentDialogHost } from "./DocumentDialogHost";

export interface DocumentTableViewProps {
  rows: readonly DocumentSummary[];
  columns: readonly DataGridColumn<DocumentSummary>[];
  actions: readonly DocumentActionDefinition[];
  tableClassName?: string;
  ariaLabel: string;
  loading?: boolean;
  error?: unknown;
  empty?: ReactNode;
  pagination?: PaginationProps;
  commands?: DocumentCommandHandlers;
  onDelete?: (documentId: DocumentId) => void | Promise<void>;
  renderPreview?: (document: DocumentSummary) => ReactNode;
}

export function DocumentTableView({
  rows,
  columns,
  actions,
  tableClassName,
  ariaLabel,
  loading,
  error,
  empty,
  pagination,
  commands,
  onDelete,
  renderPreview,
}: DocumentTableViewProps) {
  const [dialog, setDialog] = useState<DocumentDialogState>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingCommand, setPendingCommand] = useState<{
    readonly documentId: DocumentId;
    readonly command: "publish" | "startReview";
  } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const commandHandlers = {
    publish: commands?.publish
      ? async (documentId: DocumentId) => {
          setPendingCommand({ documentId, command: "publish" });
          try {
            await commands.publish?.(documentId);
            setFeedback("文件已入库");
          } catch (commandError) {
            setFeedback(
              commandError instanceof Error
                ? `入库失败：${commandError.message}`
                : "入库失败，请稍后重试",
            );
          } finally {
            setPendingCommand(null);
          }
        }
      : undefined,
    startReview: commands?.startReview
      ? async (documentId: DocumentId) => {
          setPendingCommand({ documentId, command: "startReview" });
          try {
            await commands.startReview?.(documentId);
            setFeedback("已开始审查");
          } catch (commandError) {
            setFeedback(
              commandError instanceof Error
                ? `发起审查失败：${commandError.message}`
                : "发起审查失败，请稍后重试",
            );
          } finally {
            setPendingCommand(null);
          }
        }
      : undefined,
  };

  const handleDelete = onDelete
    ? async (documentId: DocumentId) => {
        await onDelete(documentId);
        setFeedback("文件已删除");
      }
    : undefined;
  const columnsWithActions: readonly DataGridColumn<DocumentSummary>[] = [
    ...columns,
    {
      id: "actions",
      header: "操作",
      width: 250,
      cell: (document) => (
        <DocumentActionCell
          document={document}
          actions={actions}
          commands={commandHandlers}
          availableDialogs={{ delete: Boolean(onDelete) }}
          pendingCommand={pendingCommand}
          openDialog={setDialog}
        />
      ),
    },
  ];

  return (
    <>
      <DataGrid
        rows={rows}
        columns={columnsWithActions}
        getRowKey={(document) => document.id}
        className={tableClassName}
        ariaLabel={ariaLabel}
        loading={loading}
        error={error}
        empty={empty}
        renderMobileCard={(document) => (
          <article className="document-mobile-card">
            <header>
              <div>{columns[0]?.cell(document)}</div>
              <div>{columns.find((column) => column.id === "status")?.cell(document)}</div>
            </header>
            <dl>
              {columns
                .filter((column) => column.id !== "name" && column.id !== "status")
                .map((column) => (
                  <div key={column.id}>
                    <dt>{column.header}</dt>
                    <dd>{column.cell(document)}</dd>
                  </div>
                ))}
            </dl>
            <DocumentActionCell
              document={document}
              actions={actions}
              commands={commandHandlers}
              availableDialogs={{ delete: Boolean(onDelete) }}
              pendingCommand={pendingCommand}
              openDialog={setDialog}
            />
          </article>
        )}
      />
      <div className="action-feedback-slot" role="status" aria-live="polite">
        {feedback ? (
          <span
            className={`action-feedback${feedback.includes("失败") ? " error" : ""}`}
          >
            {feedback}
          </span>
        ) : null}
      </div>
      {pagination ? <Pagination {...pagination} /> : null}
      <DocumentDialogHost
        state={dialog}
        documents={rows}
        onClose={() => setDialog(null)}
        onDelete={handleDelete}
        renderPreview={renderPreview}
      />
    </>
  );
}
