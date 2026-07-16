import type {
  ContractEditorSession,
  ContractReviewTask,
  ContractRiskState,
  CreateContractReviewTaskInput,
} from "../domain";

export interface ContractReviewApi {
  listTasks(): Promise<readonly ContractReviewTask[]>;
  getTask(taskId: string): Promise<ContractReviewTask | undefined>;
  getEditorSession(taskId: string): Promise<ContractEditorSession>;
  createTask(input: CreateContractReviewTaskInput): Promise<ContractReviewTask>;
  startReview(taskId: string): Promise<ContractReviewTask>;
  generateReport(taskId: string): Promise<ContractReviewTask>;
  updateRisk(
    taskId: string,
    riskId: string,
    command: {
      readonly state: ContractRiskState;
      readonly reason?: string;
    },
  ): Promise<ContractReviewTask>;
  storeTask(taskId: string): Promise<ContractReviewTask>;
}
