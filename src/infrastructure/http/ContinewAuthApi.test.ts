import { afterEach, describe, expect, it, vi } from "vitest";
import { ContinewAuthApi } from "./ContinewAuthApi";
import { HttpClient } from "./HttpClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ContinewAuthApi", () => {
  it("uses the ContiNew account login contract", async () => {
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.stubGlobal("window", {
      sessionStorage: { setItem, removeItem },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        code: "0",
        msg: "操作成功",
        success: true,
        timestamp: 1784280600000,
        data: { token: "token-value", tenantId: 1 },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const api = new ContinewAuthApi(new HttpClient({
      baseUrl: "",
      fetchImplementation: fetchMock,
    }));

    await expect(api.login({
      username: "tester",
      password: "secret",
      captcha: "A7K9",
      uuid: "captcha-uuid",
    }))
      .resolves.toMatchObject({ status: "authenticated" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/continew/auth/login");
    expect(request?.method).toBe("POST");
    const requestBody = JSON.parse(String(request?.body)) as Record<string, string>;
    expect(requestBody).toMatchObject({
      clientId: "ef51c9a3e9046c4f2ea45142c8a8344a",
      authType: "ACCOUNT",
      username: "tester",
      captcha: "A7K9",
      uuid: "captcha-uuid",
    });
    expect(requestBody.password).not.toBe("secret");
    expect(Buffer.from(requestBody.password, "base64")).toHaveLength(64);
    expect(setItem).toHaveBeenCalledWith(
      "proofspace_access_token",
      "token-value",
    );
  });

  it("loads the graphic captcha contract", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        code: "0",
        msg: "操作成功",
        success: true,
        timestamp: 1784280600000,
        data: {
          uuid: "captcha-uuid",
          img: "data:image/png;base64,AAAA",
          expireTime: 1784280720000,
          isEnabled: true,
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const api = new ContinewAuthApi(new HttpClient({
      baseUrl: "",
      fetchImplementation: fetchMock,
    }));

    await expect(api.getCaptcha()).resolves.toEqual({
      uuid: "captcha-uuid",
      img: "data:image/png;base64,AAAA",
      expireTime: 1784280720000,
      isEnabled: true,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/continew/captcha/image");
  });

  it("treats HTTP 200 with an R failure code as a failed login", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        code: "401",
        msg: "您的登录状态已过期，请重新登录",
        success: false,
        timestamp: 1784280600000,
        data: null,
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const api = new ContinewAuthApi(new HttpClient({
      baseUrl: "",
      fetchImplementation: fetchMock,
    }));

    await expect(api.login({ username: "tester", password: "bad" }))
      .rejects.toThrow("您的登录状态已过期，请重新登录");
  });
});
