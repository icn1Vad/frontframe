import type { AuthApi } from "../features/auth";
import type { ContractReviewApi } from "../features/contracts/application";
import type {
  ClassificationTaskPoolApi,
  ClassificationWorkflowApi,
  DocumentRepository,
  KnowledgeApi,
  MutationOptions,
  ReviewTaskPoolApi,
} from "../features/documents/application";
import {
  MockClassificationTaskPoolApi,
  MockClassificationWorkflowApi,
  MockKnowledgeApi,
  mockDocumentRepository,
} from "../features/documents/infrastructure";
import { ContinewAuthApi } from "../infrastructure/http/ContinewAuthApi";
import { BusinessChatApi } from "../infrastructure/http/BusinessChatApi";
import { BusinessReviewApi } from "../infrastructure/http/BusinessReviewApi";
import {
  AuthHttpAdapter,
  ContractReviewHttpAdapter,
} from "../infrastructure/http/adapters";
import { HttpClient } from "../infrastructure/http/HttpClient";
import { clearAccessToken, getAccessToken } from "../shared/lib/accessToken";

export interface DashboardOverview {
  readonly metrics: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

export interface DashboardApi {
  getOverview(): Promise<DashboardOverview>;
}

export interface ChatCitation {
  readonly documentId: string;
  readonly documentName: string;
  readonly location?: string;
  readonly excerpt: string;
}

export interface ChatStreamHandlers {
  readonly onMeta?: (meta: {
    readonly requestId: string;
    readonly conversationId: string;
    readonly messageId: string;
  }) => void;
  readonly onDelta?: (content: string) => void;
  readonly onCitation?: (citation: ChatCitation) => void;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt: string;
  readonly citations: readonly ChatCitation[];
}

export interface ChatConversation {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly messages: readonly ChatMessage[];
}

export interface ChatApi {
  listConversations(): Promise<readonly ChatConversation[]>;
  getConversation(id: string): Promise<ChatConversation | undefined>;
  createConversation(
    title: string | undefined,
    options: MutationOptions,
  ): Promise<ChatConversation>;
  deleteConversation(id: string, options: MutationOptions): Promise<void>;
  sendMessage(
    conversationId: string,
    question: string,
    options: MutationOptions & ChatStreamHandlers,
  ): Promise<ChatMessage>;
}

export interface AppServices {
  readonly auth: AuthApi;
  readonly dashboard: DashboardApi;
  readonly classification: ClassificationWorkflowApi;
  readonly classificationTasks: ClassificationTaskPoolApi;
  readonly reviewTasks: ReviewTaskPoolApi;
  readonly contractReview: ContractReviewApi;
  readonly documents: DocumentRepository;
  readonly knowledge: KnowledgeApi;
  readonly chat: ChatApi;
}

const auth: AuthApi = new ContinewAuthApi(new HttpClient({
  baseUrl: "",
  onUnauthorized: clearAccessToken,
}));

const businessClient = new HttpClient({
  baseUrl: "",
  getAccessToken,
  onUnauthorized: clearAccessToken,
});
const businessReview = new BusinessReviewApi(businessClient);

const classification = new MockClassificationWorkflowApi(
  mockDocumentRepository,
  [],
  (file, idempotencyKey, signal) => businessReview.uploadPolicy(file, idempotencyKey, signal),
);
const classificationTasks = new MockClassificationTaskPoolApi(
  mockDocumentRepository,
  (fileId, idempotencyKey, signal) => businessReview.createTask(fileId, idempotencyKey, signal),
);
const reviewTasks = businessReview;
const knowledge = new MockKnowledgeApi(mockDocumentRepository);
const contractClient = new HttpClient({
  baseUrl: "/proofspace-api/api/v1",
});
const contractReviewAdapter = new ContractReviewHttpAdapter(contractClient);

/** ProofSpace uses an HttpOnly session cookie independently from ContiNew auth. */
export const contractReviewAuth: AuthApi = new AuthHttpAdapter(contractClient);

function unavailableContractFeature(): never {
  throw new Error("当前阶段仅开放真实 DOCX 的 WPS 在线预览编辑");
}

const contractReview: ContractReviewApi = {
  listTasks: (options) => contractReviewAdapter.listTasks(options),
  getTask: (taskId, options) => contractReviewAdapter.getTask(taskId, options),
  getEditorSession: (taskId, options) =>
    contractReviewAdapter.getEditorSession(taskId, options),
  createTask: (input, options) => contractReviewAdapter.createTask(input, options),
  async startReview() {
    return unavailableContractFeature();
  },
  async generateReport() {
    return unavailableContractFeature();
  },
  async updateRisk() {
    return unavailableContractFeature();
  },
  async storeTask() {
    return unavailableContractFeature();
  },
};

const dashboard: DashboardApi = {
  async getOverview() {
    return {
      metrics: [
        { label: "已入库制度", value: "0" },
        { label: "已入库合同", value: "0" },
        { label: "已入库报告", value: "0" },
        { label: "已入库其他文件", value: "0" },
      ],
    };
  },
};

const chat: ChatApi = new BusinessChatApi(getAccessToken, clearAccessToken, businessClient);

/** Application composition root. Swap adapters here, not inside pages or UI. */
export const appServices: AppServices = Object.freeze({
  auth,
  dashboard,
  classification,
  classificationTasks,
  reviewTasks,
  contractReview,
  documents: mockDocumentRepository,
  knowledge,
  chat,
});
