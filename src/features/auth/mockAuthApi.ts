import type {
  AuthApi,
  AuthSession,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
} from "./AuthApi";

const MOCK_LATENCY_MS = 320;
let activeSession: AuthSession | null = null;

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, MOCK_LATENCY_MS);
  });
}

export const mockAuthApi: AuthApi = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    await waitForMockResponse();
    activeSession = {
      user: {
        id: "user_zhang_san",
        username: payload.username,
        displayName: "张三",
        roleLabel: "管理员",
        permissions: [
          "dashboard:read",
          "documents:write",
          "reviews:write",
          "reviews:read",
          "contracts:write",
          "contracts:read",
          "knowledge:read",
          "chat:use",
        ],
      },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      csrfToken: "mock-csrf-token",
    };
    return {
      status: "authenticated",
      message: "登录成功，正在进入工作台。",
      session: activeSession,
    };
  },

  async register(payload: RegisterPayload): Promise<RegisterResult> {
    void payload;
    await waitForMockResponse();
    return {
      status: "unavailable",
      message: "注册申请暂未开放，请联系管理员创建账号。",
    };
  },

  async getSession() {
    return activeSession;
  },

  async logout() {
    activeSession = null;
  },
};
