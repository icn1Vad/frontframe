import { useState, type ReactNode } from "react";
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
  const columnsWithActions: readonly DataGridColumn<DocumentSummary>[] = [
    ...columns,
    {
      id: "actions",
      header: "操作",
      width: 280,
      cell: (document) => (
        <DocumentActionCell
          document={document}
          actions={actions}
          commands={commands}
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
      />
      {pagination ? <Pagination {...pagination} /> : null}
      <DocumentDialogHost
        state={dialog}
        documents={rows}
        onClose={() => setDialog(null)}
        onDelete={onDelete}
        renderPreview={renderPreview}
      />
    </>
  );
}
