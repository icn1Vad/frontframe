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

  it("registers an ordinary user without an approval state", async () => {
    vi.useFakeTimers();
    const resultPromise = mockAuthApi.register({
      username: "demo-user",
      password: "demo-password",
      requestedRole: "user",
    });

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual({
      status: "registered",
      message: "注册成功，请使用新账号登录。",
    });
  });
});
