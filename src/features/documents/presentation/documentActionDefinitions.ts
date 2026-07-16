import { Eye, FolderArchive, ListChecks, Trash2 } from "lucide-react";
import { routes } from "../../../app/routes";
import {
  getDocumentContractTaskId,
  getDocumentReviewTaskId,
  type DocumentSummary,
} from "../domain";
import type { DocumentActionDefinition } from "./documentActions";

function reviewReportHref(document: DocumentSummary) {
  const taskId = getDocumentReviewTaskId(document.state);
  if (!taskId) {
    throw new Error(
      `Document ${document.id} is not associated with a review task.`,
    );
  }
  return routes.reviewReport(taskId);
}

function contractReviewReportHref(document: DocumentSummary) {
  const taskId = getDocumentContractTaskId(document.state);
  if (!taskId) {
    throw new Error(
      `Document ${document.id} is not associated with a contract review task.`,
    );
  }
  return routes.contractReviewTask(taskId);
}

export const classificationDocumentActions = [
  {
    id: "preview",
    type: "dialog",
    dialog: "preview",
    label: "预览",
    icon: Eye,
    isPrimary: (document) =>
      document.state.kind !== "pending" &&
      document.state.kind !== "classified",
    variant: "secondary",
  },
  {
    id: "publish",
    type: "command",
    command: "publish",
    label: "直接入库",
    icon: FolderArchive,
    isPrimary: () => true,
    variant: "secondary",
    isVisible: (document) =>
      document.state.kind === "pending" || document.state.kind === "classified",
  },
  {
    id: "start-review",
    type: "command",
    command: "startReview",
    label: "发起审查",
    icon: ListChecks,
    isPrimary: () => true,
    variant: "primary",
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

export const reviewDocumentActions = [
  {
    id: "progress",
    type: "dialog",
    dialog: "progress",
    label: "查看进度",
    icon: ListChecks,
    isPrimary: () => true,
    variant: "secondary",
    isVisible: (document) => document.state.kind === "reviewing",
  },
  {
    id: "report",
    type: "link",
    label: "查看报告",
    icon: ListChecks,
    isPrimary: () => true,
    variant: "secondary",
    href: reviewReportHref,
    isVisible: (document) =>
      document.state.kind === "reviewed" ||
      (document.state.kind === "published" &&
        document.state.source === "review") ||
      (document.state.kind === "deleted" &&
        Boolean(document.state.reviewTaskId)),
  },
  {
    id: "publish",
    type: "command",
    command: "publish",
    label: "入库",
    icon: FolderArchive,
    isVisible: (document) => document.state.kind === "reviewed",
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
] as const satisfies readonly DocumentActionDefinition[];

export const knowledgeDocumentActions = [
  {
    id: "contract-report",
    type: "link",
    label: "查看合同报告",
    icon: ListChecks,
    isPrimary: () => true,
    variant: "secondary",
    href: contractReviewReportHref,
    isVisible: (document) =>
      Boolean(getDocumentContractTaskId(document.state)),
  },
  {
    id: "report",
    type: "link",
    label: "查看报告",
    icon: ListChecks,
    isPrimary: () => true,
    variant: "secondary",
    href: reviewReportHref,
    isVisible: (document) =>
      Boolean(getDocumentReviewTaskId(document.state)),
  },
  {
    id: "preview",
    type: "dialog",
    dialog: "preview",
    label: "预览",
    icon: Eye,
    isPrimary: () => true,
    variant: "secondary",
    isVisible: (document) =>
      !getDocumentReviewTaskId(document.state) &&
      !getDocumentContractTaskId(document.state),
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
