import { describe, expect, it } from "vitest";
import {
  areConversationControlsLocked,
  chatStreamReducer,
  createActiveChatStream,
  shouldAutoRecover,
} from "./chatStreamState";

const request = {
  conversationId: "conversation-1",
  question: "采购审批应该怎么走？",
  idempotencyKey: "same-idempotency-key",
};

describe("chatStreamState", () => {
  it("从连接进入生成并在首段正文到达后收起过程", () => {
    let state = createActiveChatStream(request);
    state = chatStreamReducer(state, {
      type: "meta",
      meta: {
        requestId: "request-1",
        conversationId: request.conversationId,
        messageId: "message-1",
        sequence: 0,
        resumed: false,
      },
    });
    state = chatStreamReducer(state, { type: "delta", content: "需要履行审批程序。" });

    expect(state).toMatchObject({
      phase: "generating",
      connected: true,
      content: "需要履行审批程序。",
      processExpanded: false,
    });
  });

  it("恢复时保留原请求和引用，snapshot 替换正文", () => {
    let state = createActiveChatStream(request);
    state = chatStreamReducer(state, { type: "delta", content: "旧的部分正文" });
    state = chatStreamReducer(state, {
      type: "citation",
      citation: {
        documentId: null,
        documentName: "采购管理制度",
        location: null,
        excerpt: null,
      },
    });
    state = chatStreamReducer(state, { type: "recover", automatic: true });
    state = chatStreamReducer(state, { type: "snapshot", content: "服务端完整快照" });

    expect(state.request).toEqual(request);
    expect(state.autoRecoveryUsed).toBe(true);
    expect(state.content).toBe("服务端完整快照");
    expect(state.citations).toHaveLength(1);
  });

  it("按可用字段去重引用并保留可重试失败", () => {
    const citation = {
      documentId: "policy-1",
      documentName: "采购制度",
      location: "第三章",
      excerpt: null,
    } as const;
    let state = createActiveChatStream(request);
    state = chatStreamReducer(state, { type: "citation", citation });
    state = chatStreamReducer(state, { type: "citation", citation });
    state = chatStreamReducer(state, {
      type: "fail",
      message: "连接中断",
      retryable: true,
    });

    expect(state.citations).toHaveLength(1);
    expect(state).toMatchObject({
      phase: "failed",
      errorMessage: "连接中断",
      retryable: true,
      processExpanded: true,
    });
  });

  it("同一条消息只允许一次自动恢复", () => {
    expect(shouldAutoRecover(true, false)).toBe(true);
    expect(shouldAutoRecover(true, true)).toBe(false);
    expect(shouldAutoRecover(false, false)).toBe(false);
  });

  it("生成或恢复期间锁定会话操作", () => {
    expect(areConversationControlsLocked(true, null)).toBe(true);
    expect(areConversationControlsLocked(false, "create")).toBe(true);
    expect(areConversationControlsLocked(false, null)).toBe(false);
  });
});
