import { FolderArchive, ListChecks, Trash2 } from "lucide-react";
import { routes } from "@/app/routes";
import {
  formatDocumentDateTime,
  createDocumentColumns,
} from "./documentPresentation";
import type { DocumentActionDefinition } from "./documentActions";
import {
  DocumentTableView,
  type DocumentTableViewProps,
} from "./DocumentTableView";
import {
  getDocumentReviewTaskId,
  getDocumentStateTimestamp,
  type DocumentSummary,
} from "../domain";

function reviewReportHref(document: DocumentSummary) {
  const taskId = getDocumentReviewTaskId(document.state);
  if (!taskId) {
    throw new Error(`Document ${document.id} is not associated with a review task.`);
  }
  return routes.reviewReport(taskId);
}

export const reviewDocumentColumns = createDocumentColumns({
  timeHeader: "审查进度 / 时间",
  operatorHeader: "审查执行人",
  renderTime: (document) => {
    if (document.state.kind === "reviewing") {
      const progress = Math.min(100, Math.max(0, document.state.progress));
      return (
        <span className="review-progress">
          <i>
            <b style={{ width: `${progress}%` }} />
          </i>
          {progress}%
        </span>
      );
    }
    return (
      <strong>
        {formatDocumentDateTime(getDocumentStateTimestamp(document.state))}
      </strong>
    );
  },
});

export const reviewDocumentActions = [
  {
    id: "progress",
    type: "dialog",
    dialog: "progress",
    label: "查看进度",
    icon: ListChecks,
    isVisible: (document) => document.state.kind === "reviewing",
  },
  {
    id: "report",
    type: "link",
    label: "查看报告",
    icon: ListChecks,
    href: reviewReportHref,
    isVisible: (document) =>
      document.state.kind === "reviewed" ||
      (document.state.kind === "published" && document.state.source === "review"),
  },
  {
    id: "delete",
    type: "dialog",
    dialog: "delete",
    label: "删除",
    icon: Trash2,
    danger: true,
    isVisible: (document) =>
      document.state.kind === "reviewing" || document.state.kind === "reviewed",
  },
  {
    id: "publish",
    type: "command",
    command: "publish",
    label: "入库",
    icon: FolderArchive,
    isVisible: (document) => document.state.kind === "reviewed",
  },
] as const satisfies readonly DocumentActionDefinition[];

export type ReviewDocumentsTableProps = Omit<
  DocumentTableViewProps,
  "columns" | "actions" | "tableClassName" | "ariaLabel"
>;

export function ReviewDocumentsTable(props: ReviewDocumentsTableProps) {
  return (
    <DocumentTableView
      {...props}
      columns={reviewDocumentColumns}
      actions={reviewDocumentActions}
      tableClassName="review"
      ariaLabel="审查任务文件"
    />
  );
}
