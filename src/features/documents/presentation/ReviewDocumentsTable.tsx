import {
  formatDocumentDateTime,
  createDocumentColumns,
} from "./documentPresentation";
import { reviewDocumentActions } from "./documentActionDefinitions";
import {
  DocumentTableView,
  type DocumentTableViewProps,
} from "./DocumentTableView";
import { getDocumentStateTimestamp } from "../domain";

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

export { reviewDocumentActions } from "./documentActionDefinitions";

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
      ariaLabel="审查任务池文件"
    />
  );
}
