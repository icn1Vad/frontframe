import { describe, expect, it, vi } from "vitest";
import {
  ClassificationTaskPoolHttpAdapter,
  ClassificationWorkflowHttpAdapter,
} from "./adapters";
import { HttpClient } from "./HttpClient";
import {
  createClassificationCandidateId,
  createDocumentId,
} from "../../features/documents/domain";

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json" },
  });
}

describe("classification HTTP adapters", () => {
  it("publishes directly to knowledge through the formal endpoint", async () => {
    const fetchImplementation = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return jsonResponse({
          id: "doc-demo",
          name: "采购制度.docx",
          type: "policy",
          level: "company",
          category: "procurement",
          state: {
            kind: "published",
            source: "classification",
            publishedAt: "2026-07-16T09:30:00.123456789Z",
          },
          operator: { id: "root", displayName: "root" },
          capabilities: { canDelete: true },
        });
      },
    );
    const adapter = new ClassificationTaskPoolHttpAdapter(
      new HttpClient({
        fetchImplementation: fetchImplementation as unknown as typeof fetch,
      }),
    );

    const result = await adapter.publish(createDocumentId("doc-demo"), {
      idempotencyKey: "publish-doc-demo",
    });

    expect(result.state).toMatchObject({
      kind: "published",
      source: "classification",
    });
    const [url, init] = fetchImplementation.mock.calls[0]!;
    expect(String(url)).toContain(
      "/api/v1/classification-tasks/doc-demo/publish",
    );
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe(
      "publish-doc-demo",
    );
  });

  it("keeps the confirmed name and classification metadata in the request", async () => {
    const fetchImplementation = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        void input;
        void init;
        return jsonResponse({ succeeded: [], failed: [] });
      },
    );
    const adapter = new ClassificationWorkflowHttpAdapter(
      new HttpClient({
        fetchImplementation: fetchImplementation as unknown as typeof fetch,
      }),
    );

    await adapter.confirmCandidates(
      [
        {
          id: createClassificationCandidateId("candidate-demo"),
          name: "人工确认名称.docx",
          type: "policy",
          level: "department",
          category: "administration",
          expectedVersion: 3,
          manualOverride: true,
        },
      ],
      { idempotencyKey: "confirm-candidate-demo" },
    );

    const [, init] = fetchImplementation.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({
      items: [
        {
          id: "candidate-demo",
          name: "人工确认名称.docx",
          type: "policy",
          level: "department",
          category: "administration",
          expectedVersion: 3,
          manualOverride: true,
        },
      ],
    });
  });
});
