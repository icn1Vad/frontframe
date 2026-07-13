import { Eye, FolderArchive, ListChecks, Trash2 } from "lucide-react";
import { createDocumentColumns } from "./documentPresentation";
import type { DocumentActionDefinition } from "./documentActions";
import {
  DocumentTableView,
  type DocumentTableViewProps,
} from "./DocumentTableView";

export const classificationDocumentColumns = createDocumentColumns({
  timeHeader: "分类时间",
  operatorHeader: "分类执行人",
});

export const classificationDocumentActions = [
  {
    id: "preview",
    type: "dialog",
    dialog: "preview",
    label: "预览",
    icon: Eye,
  },
  {
    id: "publish",
    type: "command",
    command: "publish",
    label: "入库",
    icon: FolderArchive,
    isVisible: (document) =>
      document.state.kind === "pending" || document.state.kind === "classified",
  },
  {
    id: "start-review",
    type: "command",
    command: "startReview",
    label: "审查",
    icon: ListChecks,
    isVisible: (document) =>
      document.state.kind === "pending" || document.state.kind === "classified",
  },
  {
    id: "delete",
    type: "dialog",
    dialog: "delete",
    label: "删除",
    icon: Trash2,
    danger: true,
    isVisible: (document) =>
      document.state.kind === "pending" || document.state.kind === "classified",
  },
] as const satisfies readonly DocumentActionDefinition[];

export type ClassificationDocumentsTableProps = Omit<
  DocumentTableViewProps,
  "columns" | "actions" | "tableClassName" | "ariaLabel"
>;

export function ClassificationDocumentsTable(
  props: ClassificationDocumentsTableProps,
) {
  return (
    <DocumentTableView
      {...props}
      columns={classificationDocumentColumns}
      actions={classificationDocumentActions}
      tableClassName="classification"
      ariaLabel="分类任务文件"
    />
  );
}
