import { afterEach, describe, expect, it, vi } from "vitest";
import { BusinessChatApi } from "./BusinessChatApi";
import type { HttpClient } from "./HttpClient";

afterEach(() => vi.unstubAllGlobals());

describe("BusinessChatApi SSE", () => {
  it("按顺序拼接 delta 并单独收集 citation", async () => {
    const body = [
      "event: meta\r\ndata: {\"requestId\":\"r1\",\"conversationId\":\"c1\",\"messageId\":\"m1\"}\r\n\r\n",
      "event: delta\r\ndata: {\"content\":\"采购事项\"}\r\n\r\n",
      "event: delta\r\ndata: {\"content\":\"需要审批。\"}\r\n\r\n",
      "event: citation\r\ndata: {\"citation\":{\"sourceId\":\"p1\",\"sourceName\":\"采购制度\",\"location\":\"第三条\",\"excerpt\":\"应履行审批\"}}\r\n\r\n",
      "event: done\r\ndata: {\"messageId\":\"m1\"}\r\n\r\n",
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body.join(""), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    })));
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
      excerpt: "应履行审批",
    }]);
    expect(deltas).toEqual(["采购事项", "需要审批。"]);
  });

  it("将 error 事件作为失败返回", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "event: error\ndata: {\"errorCode\":\"CHAT_FAILED\",\"errorMessage\":\"检索失败\",\"retryable\":true}\n\n",
      { status: 200, headers: { "content-type": "text/event-stream" } },
    )));
    const api = new BusinessChatApi(() => "token", vi.fn(), {} as HttpClient);

    await expect(api.sendMessage("c1", "问题", { idempotencyKey: "idem-2" }))
      .rejects.toThrow("检索失败（可重试）");
  });
});
