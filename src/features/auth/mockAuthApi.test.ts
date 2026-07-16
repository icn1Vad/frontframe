import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAuthApi } from "./mockAuthApi";

describe("mockAuthApi", () => {
  afterEach(() => {
    vi.useRealTimers();
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
    });
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
      status: "demo",
      message: "注册申请暂未开放，请联系管理员创建账号。",
    });
  });
});
