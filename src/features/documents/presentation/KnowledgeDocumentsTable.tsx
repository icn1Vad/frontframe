import { createDocumentColumns } from "./documentPresentation";
import { knowledgeDocumentActions } from "./documentActionDefinitions";
import {
  DocumentTableView,
  type DocumentTableViewProps,
} from "./DocumentTableView";

export const knowledgeDocumentColumns = createDocumentColumns({
  timeHeader: "入库时间",
  operatorHeader: "入库执行人",
});

export { knowledgeDocumentActions } from "./documentActionDefinitions";

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
