import { describe, expect, it, vi } from "vitest";
import { AuthHttpAdapter, ContractReviewHttpAdapter } from "./adapters";
import { HttpClient } from "./HttpClient";

function envelope(data: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({
    code: "0",
    msg: "OK",
    success: true,
    data,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("isolated ProofSpace contract flow", () => {
  it("keeps ContiNew auth out and carries the ProofSpace CSRF token", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.endsWith("/auth/login")) {
        return envelope({
          status: "authenticated",
          message: "登录成功",
          session: {
            user: {
              id: "1",
              username: "root",
              displayName: "Root",
              roleLabel: "Administrator",
              permissions: ["documents:read", "documents:write", "documents:admin"],
            },
            expiresAt: "2026-07-18T18:00:00+08:00",
            csrfToken: "csrf-for-contract-test",
          },
        }, { "X-CSRF-Token": "csrf-for-contract-test" });
      }
      if (url.endsWith("/uploads/initiate")) {
        return envelope({
          uploadId: "upload-1",
          uploadUrl: "https://uploads.example.test/upload-1",
          method: "PUT",
          headers: { "X-ProofSpace-Upload-Token": "upload-ticket" },
          expiresAt: "2026-07-18T18:00:00+08:00",
        });
      }
      if (url === "https://uploads.example.test/upload-1") {
        return new Response(null, { status: 200, headers: { ETag: "etag-1" } });
      }
      if (url.endsWith("/uploads/upload-1/complete")) {
        return envelope({
          id: "file-1",
          name: "测试合同.docx",
          size: 4,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          status: "ready",
          createdAt: "2026-07-18T10:00:00+08:00",
        });
      }
      if (url.endsWith("/contract-review/tasks")) {
        return envelope({
          id: "contract-1",
          version: 1,
          name: "测试合同.docx",
          size: 4,
          stance: "neutral",
          modules: ["transaction"],
          status: "preview",
          progress: 0,
          createdAt: "2026-07-18T10:00:00+08:00",
          clauses: [],
          risks: [],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const client = new HttpClient({
      baseUrl: "/proofspace-api/api/v1",
      fetchImplementation: fetchImplementation as typeof fetch,
    });
    const auth = new AuthHttpAdapter(client);
    const contracts = new ContractReviewHttpAdapter(client);

    await auth.login({ username: "root", password: "not-recorded" });
    const task = await contracts.createTask({
      file: new File(["docx"], "测试合同.docx"),
      name: "测试合同.docx",
      size: 4,
      stance: "neutral",
      modules: ["transaction"],
    }, { idempotencyKey: "contract-test-idempotency" });

    expect(task.status).toBe("preview");
    expect(requests.map(({ url }) => url)).toEqual([
      "/proofspace-api/api/v1/auth/login",
      "/proofspace-api/api/v1/uploads/initiate",
      "https://uploads.example.test/upload-1",
      "/proofspace-api/api/v1/uploads/upload-1/complete",
      "/proofspace-api/api/v1/contract-review/tasks",
    ]);
    const initiateBody = JSON.parse(String(requests[1]?.init?.body));
    expect(initiateBody.contentType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    const taskHeaders = new Headers(requests[4]?.init?.headers);
    expect(taskHeaders.get("X-CSRF-Token")).toBe("csrf-for-contract-test");
    expect(taskHeaders.has("Authorization")).toBe(false);
    expect(requests[0]?.init?.credentials).toBe("include");
    expect(requests[2]?.init?.credentials).toBe("omit");
  });
});
