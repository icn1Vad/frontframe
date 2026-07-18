import { afterEach, describe, expect, it, vi } from "vitest";
import { ContinewAuthApi } from "./ContinewAuthApi";
import { HttpClient } from "./HttpClient";

function stubSessionStorage(initialToken?: string) {
  const values = new Map<string, string>();
  if (initialToken) values.set("proofspace_access_token", initialToken);
  const getItem = vi.fn((key: string) => values.get(key) ?? null);
  const setItem = vi.fn((key: string, value: string) => {
    values.set(key, value);
  });
  const removeItem = vi.fn((key: string) => {
    values.delete(key);
  });
  vi.stubGlobal("window", {
    sessionStorage: { getItem, setItem, removeItem },
  });
  return { getItem, setItem, removeItem };
}

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify({
    code: "0",
    msg: "操作成功",
    success: true,
    timestamp: 1784280600000,
    data,
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const adminUserInfo = {
  id: 1,
  username: "admin",
  nickname: "超级管理员",
  permissions: ["*:*:*"],
  roles: ["super_admin"],
  roleNames: ["超级管理员"],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ContinewAuthApi", () => {
  it("uses the ContiNew account login contract", async () => {
    const { setItem } = stubSessionStorage("stale-token");
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(successResponse({
        token: "token-value",
        tenantId: 1,
      }))
      .mockResolvedValueOnce(successResponse(adminUserInfo));
    const api = new ContinewAuthApi(new HttpClient({
      baseUrl: "",
      fetchImplementation: fetchMock,
    }));

    await expect(api.login({
      username: "admin",
      password: "secret",
      captcha: "A7K9",
      uuid: "captcha-uuid",
    }))
      .resolves.toMatchObject({
        status: "authenticated",
        session: {
          user: {
            username: "admin",
            displayName: "超级管理员",
            roleLabel: "超级管理员",
            permissions: ["*:*:*"],
          },
        },
      });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/continew/auth/login");
    expect(request?.method).toBe("POST");
    const requestBody = JSON.parse(String(request?.body)) as Record<string, string>;
    expect(requestBody).toMatchObject({
      clientId: "ef51c9a3e9046c4f2ea45142c8a8344a",
      authType: "ACCOUNT",
      username: "admin",
      captcha: "A7K9",
      uuid: "captcha-uuid",
    });
    expect(requestBody.password).not.toBe("secret");
    expect(Buffer.from(requestBody.password, "base64")).toHaveLength(64);
    expect(setItem).toHaveBeenCalledWith(
      "proofspace_access_token",
      "token-value",
    );
    const [userInfoUrl, userInfoRequest] = fetchMock.mock.calls[1]!;
    expect(userInfoUrl).toBe("/auth/user/info");
    expect(new Headers(userInfoRequest?.headers).get("Authorization"))
      .toBe("Bearer token-value");
  });

  it("validates an existing token with the user info endpoint and caches it", async () => {
    stubSessionStorage("existing-token");
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValue(successResponse(adminUserInfo));
    const api = new ContinewAuthApi(new HttpClient({
      baseUrl: "",
      fetchImplementation: fetchMock,
    }));

    await expect(api.getSession()).resolves.toMatchObject({
      user: {
        username: "admin",
        displayName: "超级管理员",
        roleLabel: "超级管理员",
        permissions: ["*:*:*"],
      },
    });
    await expect(api.getSession()).resolves.toMatchObject({
      user: { username: "admin" },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("clears the token when the login identity does not match", async () => {
    const { removeItem } = stubSessionStorage("stale-token");
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(successResponse({ token: "unexpected-token" }))
      .mockResolvedValueOnce(successResponse({
        ...adminUserInfo,
        username: "another-user",
      }));
    const api = new ContinewAuthApi(new HttpClient({
      baseUrl: "",
      fetchImplementation: fetchMock,
    }));

    await expect(api.login({ username: "admin", password: "secret" }))
      .rejects.toThrow(
        "登录身份不一致：输入账号为 admin，Token 对应账号为 another-user",
      );
    expect(removeItem).toHaveBeenLastCalledWith("proofspace_access_token");
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
    stubSessionStorage();
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
