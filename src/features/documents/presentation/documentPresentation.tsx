import { FileText } from "lucide-react";
import type { DataGridColumn } from "@/shared/table";
import { Status, type StatusTone } from "@/shared/ui";
import {
  getDocumentStateTimestamp,
  type DocumentCategoryCode,
  type DocumentLevelCode,
  type DocumentState,
  type DocumentSummary,
  type DocumentTypeCode,
  type IsoDateTime,
} from "../domain";

export const documentTypeLabels = {
  policy: "制度文件",
  contract: "合同文件",
  report: "报告文件",
  other: "其他文件",
} as const satisfies Record<DocumentTypeCode, string>;

export const documentLevelLabels = {
  company: "公司级",
  department: "部门级",
  "external-standard": "外部规范文件",
} as const satisfies Record<DocumentLevelCode, string>;

export const documentCategoryLabels = {
  procurement: "招标采购",
  contract: "合同文件",
  "supply-chain": "供应链",
  administration: "行政管理",
  "external-standard": "外部规范",
} as const satisfies Record<DocumentCategoryCode, string>;

export function getDocumentStateLabel(state: DocumentState): string {
  switch (state.kind) {
    case "pending":
      return "待处理";
    case "classified":
      return "已分类";
    case "reviewing":
      return "审查中";
    case "reviewed":
      return "已审查";
    case "published":
      if (state.source === "review") return "已审查入库";
      if (state.source === "contract-review") return "合同审查入库";
      return "已分类入库";
    case "deleted":
      return "已删除";
  }
}

export function getDocumentStateTone(state: DocumentState): StatusTone {
  switch (state.kind) {
    case "pending":
    case "classified":
      return "warning";
    case "reviewing":
      return "info";
    case "reviewed":
      return "neutral";
    case "published":
      return "success";
    case "deleted":
      return "danger";
  }
}

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDocumentDateTime(value: IsoDateTime): string {
  const parts = dateTimeFormatter.formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export interface DocumentColumnOptions {
  timeHeader: string;
  operatorHeader: string;
  renderTime?: (document: DocumentSummary) => React.ReactNode;
  renderStatus?: (document: DocumentSummary) => React.ReactNode;
}

export function createDocumentColumns({
  timeHeader,
  operatorHeader,
  renderTime = (document) => (
    <strong>
      {formatDocumentDateTime(getDocumentStateTimestamp(document.state))}
    </strong>
  ),
  renderStatus = (document) => (
    <Status tone={getDocumentStateTone(document.state)}>
      {getDocumentStateLabel(document.state)}
    </Status>
  ),
}: DocumentColumnOptions): readonly DataGridColumn<DocumentSummary>[] {
  return [
    {
      id: "name",
      header: "文件名称",
      width: 250,
      cell: (document) => (
        <strong className="file-name">
          <FileText size={17} />
          {document.name}
        </strong>
      ),
    },
    {
      id: "type",
      header: "文件类型",
      width: 120,
      cell: (document) => documentTypeLabels[document.type],
    },
    {
      id: "level",
      header: "文件层级",
      width: 120,
      cell: (document) => documentLevelLabels[document.level],
    },
    {
      id: "category",
      header: "文件分类",
      width: 140,
      cell: (document) => documentCategoryLabels[document.category],
    },
    {
      id: "status",
      header: "状态",
      width: 140,
      cell: renderStatus,
    },
    {
      id: "time",
      header: timeHeader,
      width: 140,
      cell: renderTime,
    },
    {
      id: "operator",
      header: operatorHeader,
      width: 130,
      cell: (document) => <strong>{document.operator.displayName}</strong>,
    },
  ];
}
