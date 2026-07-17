import { describe, expect, it } from "vitest";
import { isContractEditorSession } from "./documentEditor";

describe("isContractEditorSession", () => {
  it("accepts mock and WPS editor sessions", () => {
    expect(isContractEditorSession({ provider: "mock", reason: "not configured" })).toBe(true);
    expect(isContractEditorSession({
      provider: "wps",
      sdkUrl: "/vendor/wps.umd.js",
      appId: "app-id",
      fileId: "file-id",
      contractId: "contract-id",
      taskId: "task-id",
      documentVersionId: "version-id",
      officeType: "writer",
      readonly: false,
      canFinalize: true,
      draft: { status: "none", revision: 0 },
      currentUser: { id: "user-id", name: "张三", permission: "write" },
      token: { token: "short-lived-token", timeout: 600_000 },
      expiresAt: "2026-07-17T08:00:00.000Z",
    })).toBe(true);
  });

  it("rejects incomplete WPS editor sessions", () => {
    expect(isContractEditorSession({ provider: "wps", appId: "app-id" })).toBe(false);
    expect(isContractEditorSession({
      provider: "wps",
      sdkUrl: "/vendor/wps.umd.js",
      appId: "app-id",
      fileId: "file-id",
      contractId: "contract-id",
      taskId: "task-id",
      documentVersionId: "version-id",
      officeType: "writer",
      readonly: false,
      canFinalize: true,
      draft: { status: "none", revision: 0 },
      currentUser: { id: "user-id", name: "张三", permission: "write" },
      expiresAt: "2026-07-17T08:00:00.000Z",
    })).toBe(false);
    expect(isContractEditorSession(null)).toBe(false);
  });
});
