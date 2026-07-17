import { describe, expect, it } from "vitest";
import {
  decodeContractEditorSession,
  decodeContractReviewTask,
} from "./decoders";

describe("ProofSpace contract/WPS decoders", () => {
  it("accepts the Java preview task status without pretending review started", () => {
    const task = decodeContractReviewTask({
      id: "contract_test",
      version: 1,
      name: "测试合同.docx",
      size: 1024,
      stance: "neutral",
      modules: ["transaction"],
      status: "preview",
      progress: 0,
      createdAt: "2026-07-18T10:00:00+08:00",
      clauses: [],
      risks: [],
    });

    expect(task.status).toBe("preview");
    expect(task.progress).toBe(0);
  });

  it("accepts the editable WPS session returned by Java", () => {
    const session = decodeContractEditorSession({
      provider: "wps",
      sdkUrl: "/vendor/web-office-sdk-solution.umd.js",
      appId: "test-app",
      fileId: "wps-file",
      taskId: "contract_test",
      documentVersionId: "version_test",
      officeType: "writer",
      readonly: false,
      canFinalize: true,
      currentUser: { id: "1", name: "Root", permission: "write" },
      token: { token: "short-lived", timeout: 600_000 },
      mode: "normal",
      customArgs: { documentVersionId: "version_test" },
    });

    expect(session.provider).toBe("wps");
    if (session.provider === "wps") {
      expect(session.readonly).toBe(false);
      expect(session.currentUser?.permission).toBe("write");
    }
  });
});
