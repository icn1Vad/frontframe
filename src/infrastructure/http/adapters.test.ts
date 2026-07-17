import { describe, expect, it, vi } from "vitest";
import { appServices } from "../../app/services";
import { createReviewTaskId } from "../../features/documents/domain";
import { AuthHttpAdapter, createHttpAppServices } from "./adapters";
import { createJavaSliceAppServices } from "./factories";
import { HttpClient } from "./HttpClient";

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json" },
  });
}

describe("AuthHttpAdapter", () => {
  it("sends ordinary-user registration to Java and decodes the result", async () => {
    const fetchImplementation = vi.fn(async () =>
      jsonResponse({
        status: "registered",
        message: "注册成功，请使用新账号登录。",
      }),
    );
    const adapter = new AuthHttpAdapter(
      new HttpClient({
        fetchImplementation: fetchImplementation as unknown as typeof fetch,
      }),
    );
    const payload = {
      username: "new-user",
      password: "synthetic-registration-value",
      requestedRole: "user" as const,
    };

    await expect(
      adapter.register(payload),
    ).resolves.toEqual({
      status: "registered",
      message: "注册成功，请使用新账号登录。",
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      "/api/v1/auth/registrations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
        credentials: "include",
      }),
    );
  });
});

describe("createJavaSliceAppServices", () => {
  it("routes classification, knowledge and review reads to HTTP", async () => {
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/review-tasks/") && url.endsWith("/document")) {
        return jsonResponse(null);
      }
      return jsonResponse({
        items: [],
        page: 1,
        pageSize: 25,
        total: 0,
        pageCount: 0,
      });
    });
    const http = createHttpAppServices({
      fetchImplementation: fetchImplementation as unknown as typeof fetch,
    });
    const services = createJavaSliceAppServices(appServices, http);

    expect(services.auth).toBe(http.auth);
    expect(services.chat).toBe(http.chat);
    expect(services.classification).toBe(http.classification);
    expect(services.classificationTasks).toBe(http.classificationTasks);
    expect(services.documents).toBe(http.documents);
    expect(services.knowledge).toBe(http.knowledge);
    expect(services.dashboard).toBe(appServices.dashboard);
    expect(services.contractReview).toBe(http.contractReview);

    await services.reviewTasks.list({ page: 1, pageSize: 25 });
    await services.documents.getByReviewTaskId(
      createReviewTaskId("review-demo"),
    );

    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain(
      "/api/v1/review-tasks",
    );
    expect(String(fetchImplementation.mock.calls[1]?.[0])).toContain(
      "/api/v1/review-tasks/review-demo/document",
    );
  });
});
