import { describe, expect, it, vi } from "vitest";
import { HttpApiError, ResponseValidationError } from "./errors";
import { HttpClient } from "./HttpClient";

function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

describe("HttpClient", () => {
  it("uses cookie credentials, repeated query parameters and mutation headers", async () => {
    const fetchSpy = vi.fn(async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      void input;
      void init;
      return jsonResponse(
        { data: { ok: true } },
        { headers: { "X-CSRF-Token": "rotated-token" } },
      );
    });
    const client = new HttpClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImplementation: fetchSpy as unknown as typeof fetch,
      initialCsrfToken: "initial-token",
      defaultHeaders: { Cookie: "proofspace_session=session-value" },
    });

    await client.request("/items", {
      method: "POST",
      query: { state: ["open", "ignored"], page: 2 },
      body: { name: "采购制度" },
      idempotencyKey: "request-001",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, request] = fetchSpy.mock.calls[0]!;
    expect(url).toBe(
      "https://api.example.com/api/v1/items?state=open&state=ignored&page=2",
    );
    expect(request?.credentials).toBe("include");
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe(
      "request-001",
    );
    expect(new Headers(request?.headers).get("X-CSRF-Token")).toBe(
      "initial-token",
    );
    expect(new Headers(request?.headers).get("Cookie")).toBe(
      "proofspace_session=session-value",
    );
  });

  it("converts problem responses into a unified HttpApiError", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse(
        {
          title: "版本冲突",
          status: 409,
          code: "VERSION_CONFLICT",
          detail: "记录已被其他用户更新",
          traceId: "trace-001",
        },
        { status: 409 },
      ),
    ) as unknown as typeof fetch;
    const client = new HttpClient({ fetchImplementation });

    await expect(client.request("/items/1")).rejects.toMatchObject({
      name: "HttpApiError",
      status: 409,
      code: "VERSION_CONFLICT",
      traceId: "trace-001",
      retryable: false,
    } satisfies Partial<HttpApiError>);
  });

  it("rejects successful responses that do not follow the data envelope", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({ result: "unexpected" }),
    ) as unknown as typeof fetch;
    const client = new HttpClient({ fetchImplementation });

    await expect(client.request("/items")).rejects.toBeInstanceOf(
      ResponseValidationError,
    );
  });
});
