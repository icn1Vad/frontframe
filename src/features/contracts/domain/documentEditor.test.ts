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
    })).toBe(true);
  });

  it("rejects incomplete WPS editor sessions", () => {
    expect(isContractEditorSession({ provider: "wps", appId: "app-id" })).toBe(false);
    expect(isContractEditorSession(null)).toBe(false);
  });
});
