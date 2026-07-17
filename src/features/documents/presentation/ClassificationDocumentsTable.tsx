import { Status } from "@/shared/ui";
import {
  createDocumentColumns,
  getDocumentStateTone,
} from "./documentPresentation";
import { classificationDocumentActions } from "./documentActionDefinitions";
import {
  DocumentTableView,
  type DocumentTableViewProps,
} from "./DocumentTableView";

export const classificationDocumentColumns = createDocumentColumns({
  timeHeader: "分类时间",
  operatorHeader: "分类执行人",
  renderStatus: (document) => {
    const label = document.state.kind === "reviewing"
      ? "已进入审查"
      : document.state.kind === "classified"
        ? "待直接入库"
        : document.state.kind === "published"
          ? "已进入知识库"
          : document.state.kind === "deleted"
            ? "已删除"
            : "待直接入库";
    return <Status tone={getDocumentStateTone(document.state)}>{label}</Status>;
  },
});

export { classificationDocumentActions } from "./documentActionDefinitions";

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
      ariaLabel="分类任务池文件"
    />
  );
}
