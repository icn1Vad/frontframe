import { afterEach, describe, expect, it, vi } from "vitest";
import { BusinessChatApi } from "./BusinessChatApi";
import { ChatStreamError } from "../../features/chat/ChatStreamError";
import type { HttpClient } from "./HttpClient";

afterEach(() => vi.unstubAllGlobals());

describe("BusinessChatApi SSE", () => {
  it("按顺序拼接 delta 并单独收集 citation", async () => {
    const body = [
      "event: meta\r\ndata: {\"requestId\":\"r1\",\"conversationId\":\"c1\",\"messageId\":\"m1\"}\r\n\r\n",
      "event: delta\r\ndata: {\"content\":\"采购事项\"}\r\n\r\n",
      "event: delta\r\ndata: {\"content\":\"需要审批。\"}\r\n\r\n",
      "event: citation\r\ndata: {\"citation\":{\"sourceId\":\"p1\",\"sourceName\":\"采购制度\",\"location\":\"第三条\",\"excerpt\":null}}\r\n\r\n",
      "event: done\r\ndata: {\"messageId\":\"m1\"}\r\n\r\n",
    ];
    const fetchMock = vi.fn().mockResolvedValue(new Response(body.join(""), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const deltas: string[] = [];
    const api = new BusinessChatApi(
      () => "token",
      vi.fn(),
      {} as HttpClient,
    );

    const message = await api.sendMessage("c1", "问题", {
      idempotencyKey: "idem-1",
      onDelta: (content) => deltas.push(content),
    });

    expect(message.content).toBe("采购事项需要审批。");
    expect(message.citations).toEqual([{
      documentId: "p1",
      documentName: "采购制度",
      location: "第三条",
      excerpt: null,
    }]);
    expect(deltas).toEqual(["采购事项", "需要审批。"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/continew/business/chat/conversations/c1/messages/stream",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("将 error 事件作为失败返回", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "event: error\ndata: {\"errorCode\":\"CHAT_FAILED\",\"errorMessage\":\"检索失败\",\"retryable\":true}\n\n",
      { status: 200, headers: { "content-type": "text/event-stream" } },
    )));
    const api = new BusinessChatApi(() => "token", vi.fn(), {} as HttpClient);

    const error = await api.sendMessage("c1", "问题", { idempotencyKey: "idem-2" })
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ChatStreamError);
    expect(error).toMatchObject({ message: "检索失败", retryable: true, errorCode: "CHAT_FAILED" });
  });

  it("收到 done 后立即结束，不等待服务端关闭连接", async () => {
    const encoder = new TextEncoder();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(
          "event: delta\ndata: {\"content\":\"完成\"}\n\nevent: done\ndata: {\"messageId\":\"m-done\"}\n\n",
        ));
      },
      cancel() {
        cancelled = true;
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    })));
    const api = new BusinessChatApi(() => "token", vi.fn(), {} as HttpClient);

    const message = await api.sendMessage("c1", "问题", { idempotencyKey: "idem-done" });

    expect(message).toMatchObject({ id: "m-done", content: "完成" });
    expect(cancelled).toBe(true);
  });

  it("连接在 done 前中断时标记为可用原幂等键重试", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "event: delta\ndata: {\"content\":\"未完成\"}\n\n",
      { status: 200, headers: { "content-type": "text/event-stream" } },
    )));
    const api = new BusinessChatApi(() => "token", vi.fn(), {} as HttpClient);

    const error = await api.sendMessage("c1", "问题", { idempotencyKey: "idem-interrupted" })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ChatStreamError);
    expect(error).toMatchObject({ retryable: true, errorCode: "CHAT_STREAM_INTERRUPTED" });
  });

  it("读取会话时只调用列表和消息接口，不请求未约定的详情接口", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({
        list: [{ conversationId: "c1", title: "测试", createdAt: "2026-07-18", updatedAt: "2026-07-18" }],
        total: 1,
      })
      .mockResolvedValueOnce([]);
    const api = new BusinessChatApi(() => "token", vi.fn(), { request } as unknown as HttpClient);

    await api.getConversation("c1");

    expect(request.mock.calls.map(([path]) => path)).toEqual([
      "/business/chat/conversations",
      "/business/chat/conversations/c1/messages",
    ]);
  });

  it("创建会话时提交标题和幂等键并直接返回可展示会话", async () => {
    const request = vi.fn().mockResolvedValue({
      conversationId: "conversation-1",
      title: "新建提问集",
      createdAt: "2026-07-18 10:00:00",
      updatedAt: "2026-07-18 10:00:00",
    });
    const api = new BusinessChatApi(
      () => "token",
      vi.fn(),
      { request } as unknown as HttpClient,
    );

    const conversation = await api.createConversation(undefined, {
      idempotencyKey: "idem-create-conversation",
    });

    expect(request).toHaveBeenCalledWith(
      "/business/chat/conversations",
      expect.objectContaining({
        method: "POST",
        body: { title: "新建提问集" },
        idempotencyKey: "idem-create-conversation",
      }),
    );
    expect(conversation).toMatchObject({
      id: "conversation-1",
      title: "新建提问集",
      messages: [],
    });
  });

  it("缺少登录令牌时不发送创建请求并返回明确提示", async () => {
    const request = vi.fn();
    const onUnauthorized = vi.fn();
    const api = new BusinessChatApi(
      () => undefined,
      onUnauthorized,
      { request } as unknown as HttpClient,
    );

    await expect(api.createConversation(undefined, {
      idempotencyKey: "idem-no-token",
    })).rejects.toThrow("登录状态已失效，请重新登录");
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalled();
  });
});
