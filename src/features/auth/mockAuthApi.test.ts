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

  it("makes it explicit that registration is not persisted", async () => {
    vi.useFakeTimers();
    const resultPromise = mockAuthApi.register({
      username: "demo-user",
      password: "demo-password",
      requestedRole: "admin",
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual({
      status: "demo",
      message: "当前为演示环境，申请信息尚未提交到服务器。",
    });
  });
});
