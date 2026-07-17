export const contractReviewStances = ["party-a", "party-b", "neutral"] as const;
export type ContractReviewStance = (typeof contractReviewStances)[number];

export const contractReviewModuleDefinitions = [
  { id: "transaction", label: "交易结构与主体" },
  { id: "performance-payment", label: "履约、验收与付款" },
  { id: "compliance", label: "合法合规与授权" },
  { id: "data-security", label: "数据安全与保密" },
  { id: "intellectual-property", label: "知识产权" },
  { id: "termination", label: "违约、终止与退出" },
] as const;

export type ContractReviewModuleId =
  (typeof contractReviewModuleDefinitions)[number]["id"];

export const contractReviewStanceLabels: Record<ContractReviewStance, string> = {
  "party-a": "偏向甲方",
  "party-b": "偏向乙方",
  neutral: "中立审查",
};

export type ContractReviewTaskStatus =
  | "preview"
  | "queued"
  | "reviewing"
  | "reported"
  | "stored";

export type ContractRiskLevel = "high" | "medium" | "low";
export type ContractRiskState = "open" | "resolved" | "ignored";

export interface ContractClause {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly text: string;
}

export interface ContractRisk {
  readonly id: string;
  readonly clauseId: string;
  readonly moduleId: ContractReviewModuleId;
  readonly level: ContractRiskLevel;
  readonly title: string;
  readonly summary: string;
  readonly suggestion: string;
  readonly originalText: string;
  readonly state: ContractRiskState;
  readonly resolution?: {
    readonly operator: string;
    readonly handledAt: string;
    readonly reason?: string;
  };
}

export interface ContractReviewTask {
  readonly id: string;
  readonly version: number;
  readonly name: string;
  readonly size: number;
  readonly stance: ContractReviewStance;
  readonly modules: readonly ContractReviewModuleId[];
  readonly status: ContractReviewTaskStatus;
  readonly progress: number;
  readonly createdAt: string;
  readonly clauses: readonly ContractClause[];
  readonly risks: readonly ContractRisk[];
}

export interface CreateContractReviewTaskInput {
  readonly name: string;
  readonly size: number;
  readonly stance: ContractReviewStance;
  readonly modules: readonly ContractReviewModuleId[];
}

export function getContractReviewModuleLabel(
  moduleId: ContractReviewModuleId,
): string {
  return (
    contractReviewModuleDefinitions.find((module) => module.id === moduleId)
      ?.label ?? moduleId
  );
}

export function getContractReviewRiskTone(
  level: ContractRiskLevel,
): "danger" | "warning" | "info" {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "info";
}
