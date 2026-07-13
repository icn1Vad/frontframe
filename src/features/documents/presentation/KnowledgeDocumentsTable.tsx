import { Eye, ListChecks, Trash2 } from "lucide-react";
import { routes } from "@/app/routes";
import {
  getDocumentReviewTaskId,
  type DocumentSummary,
} from "../domain";
import { createDocumentColumns } from "./documentPresentation";
import type { DocumentActionDefinition } from "./documentActions";
import {
  DocumentTableView,
  type DocumentTableViewProps,
} from "./DocumentTableView";

function reviewReportHref(document: DocumentSummary) {
  const taskId = getDocumentReviewTaskId(document.state);
  if (!taskId) {
    throw new Error(`Document ${document.id} is not associated with a review task.`);
  }
  return routes.reviewReport(taskId);
}

export const knowledgeDocumentColumns = createDocumentColumns({
  timeHeader: "入库时间",
  operatorHeader: "入库执行人",
});

export const knowledgeDocumentActions = [
  {
    id: "report",
    type: "link",
    label: "查看报告",
    icon: ListChecks,
    href: reviewReportHref,
    isVisible: (document) => Boolean(getDocumentReviewTaskId(document.state)),
  },
  {
    id: "preview",
    type: "dialog",
    dialog: "preview",
    label: "预览",
    icon: Eye,
    isVisible: (document) => !getDocumentReviewTaskId(document.state),
  },
  {
    id: "delete",
    type: "dialog",
    dialog: "delete",
    label: "删除",
    icon: Trash2,
    danger: true,
  },
] as const satisfies readonly DocumentActionDefinition[];

export type KnowledgeDocumentsTableProps = Omit<
  DocumentTableViewProps,
  "columns" | "actions" | "tableClassName" | "ariaLabel"
>;

export function KnowledgeDocumentsTable(props: KnowledgeDocumentsTableProps) {
  return (
    <DocumentTableView
      {...props}
      columns={knowledgeDocumentColumns}
      actions={knowledgeDocumentActions}
      tableClassName="knowledge"
      ariaLabel="知识库文件"
    />
  );
}
