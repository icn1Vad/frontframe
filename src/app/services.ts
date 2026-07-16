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
import {
  createDocumentId,
  createIsoDateTime,
  createUserId,
} from "../features/documents/domain";

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
  readonly excerpt: string;
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
  createConversation(title?: string): Promise<ChatConversation>;
  deleteConversation(id: string): Promise<void>;
  sendMessage(
    conversationId: string,
    question: string,
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

const classification = new MockClassificationWorkflowApi(mockDocumentRepository);
const classificationTasks = new MockClassificationTaskPoolApi(mockDocumentRepository);
const reviewTasks = new MockReviewTaskPoolApi(mockDocumentRepository);
const knowledge = new MockKnowledgeApi(mockDocumentRepository);
const contractReviewAdapter = mockContractReviewApi;

const contractReview: ContractReviewApi = {
  ...contractReviewAdapter,
  async storeTask(taskId) {
    const task = await contractReviewAdapter.storeTask(taskId);
    mockDocumentRepository.upsert("knowledge", {
      id: createDocumentId(`contract_knowledge_${task.id}`),
      name: task.name,
      type: "contract",
      level: "company",
      category: "contract",
      state: {
        kind: "published",
        source: "contract-review",
        contractTaskId: task.id,
        publishedAt: createIsoDateTime(new Date().toISOString()),
      },
      operator: {
        id: createUserId("user_zhang_san"),
        displayName: "张三",
      },
    });
    return task;
  },
};

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

const chatStorageKey = "proofspace.chat.v1";
const initialChatTime = "2026-07-15T09:00:00.000Z";
let conversations: ChatConversation[] = [
  {
    id: "investment-approval",
    title: "投资审批权限校验",
    createdAt: initialChatTime,
    updatedAt: initialChatTime,
    messages: [],
  },
];

function readConversations(): ChatConversation[] {
  if (typeof window === "undefined") return conversations;
  const stored = window.localStorage.getItem(chatStorageKey);
  if (!stored) return conversations;
  try {
    const parsed = JSON.parse(stored) as ChatConversation[];
    return Array.isArray(parsed) ? parsed : conversations;
  } catch {
    window.localStorage.removeItem(chatStorageKey);
    return conversations;
  }
}

function writeConversations(next: readonly ChatConversation[]): void {
  conversations = next.map((conversation) => ({
    ...conversation,
    messages: [...conversation.messages],
  }));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(chatStorageKey, JSON.stringify(conversations));
  }
}

const chat: ChatApi = {
  async listConversations() {
    return readConversations()
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  },
  async getConversation(id) {
    return readConversations().find((item) => item.id === id);
  },
  async createConversation(title) {
    const timestamp = new Date().toISOString();
    const conversation: ChatConversation = {
      id: `conversation-${Date.now()}`,
      title: title?.trim() || "新建提问集",
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    };
    writeConversations([conversation, ...readConversations()]);
    return conversation;
  },
  async deleteConversation(id) {
    writeConversations(readConversations().filter((item) => item.id !== id));
  },
  async sendMessage(conversationId, question) {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) throw new Error("问题不能为空");
    const current = readConversations();
    const conversation = current.find((item) => item.id === conversationId);
    if (!conversation) throw new Error("提问集不存在");
    const timestamp = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: `message-user-${Date.now()}`,
      role: "user",
      content: normalizedQuestion,
      createdAt: timestamp,
      citations: [],
    };
    const knowledgeResult = await knowledge.list({
      page: 1,
      pageSize: 2,
      sort: { by: "updatedAt", direction: "desc" },
    });
    const citations = knowledgeResult.items.map<ChatCitation>((document) => ({
      documentId: document.id,
      documentName: document.name,
      excerpt: `依据“${document.name}”中的正式入库内容进行回答。`,
    }));
    const assistantMessage: ChatMessage = {
      id: `message-assistant-${Date.now()}`,
      role: "assistant",
      content: citations.length
        ? `已结合 ${citations.length} 份正式入库文件分析：${normalizedQuestion}`
        : "当前知识库暂无可引用文件，请先完成文件入库。",
      createdAt: new Date().toISOString(),
      citations,
    };
    writeConversations(
      current.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              title:
                item.messages.length === 0
                  ? normalizedQuestion.slice(0, 18)
                  : item.title,
              updatedAt: assistantMessage.createdAt,
              messages: [...item.messages, userMessage, assistantMessage],
            }
          : item,
      ),
    );
    return assistantMessage;
  },
};

/** Application composition root. Swap adapters here, not inside pages or UI. */
export const appServices: AppServices = Object.freeze({
  auth: mockAuthApi,
  dashboard,
  classification,
  classificationTasks,
  reviewTasks,
  contractReview,
  documents: mockDocumentRepository,
  knowledge,
  chat,
});
