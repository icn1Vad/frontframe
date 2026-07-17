import type {
  ContractEditorSession,
  ContractReviewTask,
  ContractRiskState,
  CreateContractReviewTaskInput,
} from "../domain";

export type CreateContractReviewTaskCommand = CreateContractReviewTaskInput & (
  | {
      readonly contractFileId: string;
      readonly policyFileIds: readonly string[];
      readonly file?: never;
    }
  | {
      readonly file: File;
      readonly contractFileId?: never;
      readonly policyFileIds?: never;
    }
);

export interface UploadedContractDocument {
  readonly fileId: string;
  readonly fileName: string;
  readonly size: number;
  readonly contentType: string;
  readonly documentType: "CONTRACT" | "POLICY";
}

export interface ContractRequestOptions {
  readonly signal?: AbortSignal;
}

export interface ContractMutationOptions extends ContractRequestOptions {
  readonly idempotencyKey: string;
  readonly expectedVersion?: number;
}

export interface ContractReviewApi {
  uploadDocument(
    file: File,
    documentType: "CONTRACT" | "POLICY",
    options: ContractMutationOptions,
  ): Promise<UploadedContractDocument>;
  listTasks(
    options?: ContractRequestOptions,
  ): Promise<readonly ContractReviewTask[]>;
  getTask(
    taskId: string,
    options?: ContractRequestOptions,
  ): Promise<ContractReviewTask | undefined>;
  getEditorSession(
    taskId: string,
    options?: ContractRequestOptions,
  ): Promise<ContractEditorSession>;
  createTask(
    input: CreateContractReviewTaskCommand,
    options: ContractMutationOptions,
  ): Promise<ContractReviewTask>;
  startReview(
    taskId: string,
    options: ContractMutationOptions,
  ): Promise<ContractReviewTask>;
  generateReport(
    taskId: string,
    options: ContractMutationOptions,
  ): Promise<ContractReviewTask>;
  updateRisk(
    taskId: string,
    riskId: string,
    command: {
      readonly state: ContractRiskState;
      readonly reason?: string;
    },
    options: ContractMutationOptions,
  ): Promise<ContractReviewTask>;
  storeTask(
    taskId: string,
    options: ContractMutationOptions,
  ): Promise<ContractReviewTask>;
}
