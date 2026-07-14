import type {
  AuthApi,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
} from "./AuthApi";

const MOCK_LATENCY_MS = 320;

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, MOCK_LATENCY_MS);
  });
}

export const mockAuthApi: AuthApi = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    void payload;
    await waitForMockResponse();
    return {
      status: "authenticated",
      message: "登录成功，正在进入工作台。",
    };
  },

  async register(payload: RegisterPayload): Promise<RegisterResult> {
    void payload;
    await waitForMockResponse();
    return {
      status: "demo",
      message: "当前为演示环境，申请信息尚未提交到服务器。",
    };
  },
};
