import type { CSSProperties, Key, ReactNode } from "react";
import { classNames } from "../lib/classNames";

export interface DataGridColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  width?: number | string;
  className?: string;
  headerClassName?: string;
}

export interface DataGridProps<T> {
  rows: readonly T[];
  columns: readonly DataGridColumn<T>[];
  getRowKey: (row: T) => Key;
  loading?: boolean;
  error?: unknown;
  empty?: ReactNode;
  loadingContent?: ReactNode;
  errorContent?: (error: unknown) => ReactNode;
  className?: string;
  rowClassName?: string | ((row: T) => string | undefined);
  ariaLabel?: string;
}

function defaultErrorContent(error: unknown): ReactNode {
  return error instanceof Error ? error.message : "数据加载失败，请稍后重试。";
}

function getColumnWidth<T>(column: DataGridColumn<T>): string {
  if (typeof column.width === "number") return `${column.width}px`;
  return column.width ?? "minmax(0, 1fr)";
}

type DataGridStyle = CSSProperties & {
  "--data-grid-columns": string;
  "--data-grid-min-width"?: string;
};

export function DataGrid<T>({
  rows,
  columns,
  getRowKey,
  loading = false,
  error = null,
  empty = "暂无数据",
  loadingContent = "正在加载…",
  errorContent = defaultErrorContent,
  className,
  rowClassName,
  ariaLabel = "数据表格",
}: DataGridProps<T>) {
  const columnTemplate = columns.map(getColumnWidth).join(" ");
  const numericWidth = columns.every((column) => typeof column.width === "number")
    ? columns.reduce((total, column) => total + (column.width as number), 0)
    : null;
  const gridStyle: DataGridStyle = {
    "--data-grid-columns": columnTemplate,
    "--data-grid-min-width": numericWidth === null ? undefined : `${numericWidth}px`,
  };
  const stateKind = loading
    ? "loading"
    : error
      ? "error"
      : rows.length === 0
        ? "empty"
        : null;
  const stateContent = loading
    ? loadingContent
    : error
      ? errorContent(error)
      : rows.length === 0
        ? empty
        : null;

  return (
    <div
      className={classNames("data-table", "data-grid", className)}
      role="table"
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-colcount={columns.length}
      aria-rowcount={stateContent === null ? rows.length + 1 : 2}
      style={gridStyle}
    >
      <div className="data-grid-inner">
        <div
          className="table-row table-head"
          role="row"
          style={{ gridTemplateColumns: "var(--data-grid-columns)" }}
        >
          {columns.map((column) => (
            <span
              className={classNames("filter-label", column.headerClassName)}
              role="columnheader"
              key={column.id}
            >
              {column.header}
            </span>
          ))}
        </div>

        {stateContent !== null ? (
          <div
            className="table-row data-grid-state"
            data-state={stateKind ?? undefined}
            role="row"
            key={stateKind}
            style={{ gridTemplateColumns: "var(--data-grid-columns)" }}
          >
            <span role="cell" style={{ gridColumn: "1 / -1" }}>
              {stateContent}
            </span>
          </div>
        ) : (
          rows.map((row) => (
            <div
              className={classNames(
                "table-row",
                typeof rowClassName === "function"
                  ? rowClassName(row)
                  : rowClassName,
              )}
              role="row"
              key={getRowKey(row)}
              style={{ gridTemplateColumns: "var(--data-grid-columns)" }}
            >
              {columns.map((column) => (
                <span className={column.className} role="cell" key={column.id}>
                  {column.cell(row)}
                </span>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
