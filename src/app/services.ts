import type { AuthApi } from "../features/auth";
import { mockAuthApi } from "../features/auth";
import type { ContractReviewApi } from "../features/contracts/application";
import { mockContractReviewApi } from "../features/contracts/infrastructure";
import type {
  ClassificationTaskPoolApi,
  ClassificationWorkflowApi,
  DocumentRepository,
  KnowledgeApi,
  ReviewTaskPoolApi,
} from "../features/documents/application";
import {
  MockClassificationTaskPoolApi,
  MockClassificationWorkflowApi,
  MockKnowledgeApi,
  MockReviewTaskPoolApi,
  mockDocumentRepository,
} from "../features/documents/infrastructure";

export interface DashboardOverview {
  readonly metrics: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

export interface DashboardApi {
  getOverview(): Promise<DashboardOverview>;
}

export interface ChatConversation {
  readonly id: string;
  readonly title: string;
}

export interface ChatApi {
  listConversations(): Promise<readonly ChatConversation[]>;
  createConversation(title: string): Promise<ChatConversation>;
  deleteConversation(id: string): Promise<void>;
  sendMessage(
    conversationId: string,
    question: string,
  ): Promise<{ readonly answer: string; readonly citationDocumentIds: readonly string[] }>;
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

const classification = new MockClassificationWorkflowApi(mockDocumentRepository);
const classificationTasks = new MockClassificationTaskPoolApi(mockDocumentRepository);
const reviewTasks = new MockReviewTaskPoolApi(mockDocumentRepository);
const knowledge = new MockKnowledgeApi(mockDocumentRepository);

const dashboard: DashboardApi = {
  async getOverview() {
    return {
      metrics: [
        { label: "已入库制度", value: "1,284" },
        { label: "已入库合同", value: "8,426" },
        { label: "已入库报告", value: "326" },
        { label: "已入库其他文件", value: "674" },
      ],
    };
  },
};

const conversations: ChatConversation[] = [
  { id: "investment-approval", title: "投资审批权限校验" },
];

const chat: ChatApi = {
  async listConversations() {
    return [...conversations];
  },
  async createConversation(title) {
    const conversation = { id: `conversation-${Date.now()}`, title };
    conversations.push(conversation);
    return conversation;
  },
  async deleteConversation(id) {
    const index = conversations.findIndex((item) => item.id === id);
    if (index >= 0) conversations.splice(index, 1);
  },
  async sendMessage(_conversationId, question) {
    return {
      answer: `已基于正式入库知识库检索：${question}`,
      citationDocumentIds: [],
    };
  },
};

/** Application composition root. Swap adapters here, not inside pages or UI. */
export const appServices: AppServices = Object.freeze({
  auth: mockAuthApi,
  dashboard,
  classification,
  classificationTasks,
  reviewTasks,
  contractReview: mockContractReviewApi,
  documents: mockDocumentRepository,
  knowledge,
  chat,
});
