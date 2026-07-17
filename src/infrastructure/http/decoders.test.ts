import { describe, expect, it } from "vitest";
import { ResponseValidationError } from "./errors";
import {
  decodeChatMessageResult,
  decodeRegisterResult,
  decodeReviewReport,
} from "./decoders";

const assistantMessage = {
  id: "message-1",
  role: "assistant",
  content: "演示回答",
  createdAt: "2026-07-16T08:00:00.000Z",
  citations: [],
};

describe("AI result source decoders", () => {
  it("requires STUB or AI on assistant chat messages", () => {
    expect(
      decodeChatMessageResult({ ...assistantMessage, source: "STUB" }),
    ).toMatchObject({ role: "assistant", source: "STUB" });
    expect(() => decodeChatMessageResult(assistantMessage)).toThrow(
      ResponseValidationError,
    );
    expect(() =>
      decodeChatMessageResult({
        ...assistantMessage,
        role: "user",
        source: "STUB",
      }),
    ).toThrow(ResponseValidationError);
  });

  it("requires STUB or AI on every review risk", () => {
    const report = {
      taskId: "review-demo",
      documentName: "演示制度.docx",
      summary: "演示审查结果",
      risks: [
        {
          id: "risk-1",
          category: "executability",
          level: "critical",
          title: "边界不清",
          summary: "职责边界不清",
          evidence: "相关条款",
          suggestion: "明确职责",
          state: "open",
          source: "STUB",
        },
      ],
    };

    expect(decodeReviewReport(report).risks[0]).toMatchObject({
      category: "executability",
      level: "critical",
      source: "STUB",
    });
    expect(() =>
      decodeReviewReport({
        ...report,
        risks: [{ ...report.risks[0], source: undefined }],
      }),
    ).toThrow(ResponseValidationError);
  });
});

describe("registration decoder", () => {
  it("accepts only the direct-registration result", () => {
    expect(
      decodeRegisterResult({
        status: "registered",
        message: "注册成功",
      }),
    ).toEqual({
      status: "registered",
      message: "注册成功",
    });
    expect(() =>
      decodeRegisterResult({
        status: "unavailable",
        message: "旧冻结响应",
      }),
    ).toThrow(ResponseValidationError);
  });
});
