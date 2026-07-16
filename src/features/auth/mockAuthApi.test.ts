import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAuthApi } from "./mockAuthApi";

describe("mockAuthApi", () => {
  afterEach(async () => {
    vi.useRealTimers();
    await mockAuthApi.logout();
  });

  it("returns an authenticated result for the demo login flow", async () => {
    vi.useFakeTimers();
    const resultPromise = mockAuthApi.login({
      username: "demo-user",
      password: "demo-password",
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toMatchObject({
      status: "authenticated",
      session: {
        user: {
          username: "demo-user",
          permissions: expect.arrayContaining(["dashboard:read"]),
        },
      },
    });
    await expect(mockAuthApi.getSession()).resolves.not.toBeNull();
  });

  it("reports that self-service registration is unavailable", async () => {
    vi.useFakeTimers();
    const resultPromise = mockAuthApi.register({
      username: "demo-user",
      password: "demo-password",
      requestedRole: "admin",
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual({
      status: "unavailable",
      message: "注册申请暂未开放，请联系管理员创建账号。",
    });
  });
});
