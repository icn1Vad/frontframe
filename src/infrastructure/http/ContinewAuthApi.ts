import type {
  AuthApi,
  LoginCaptcha,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
} from "../../features/auth";
import {
  clearAccessToken,
  setAccessToken,
} from "../../shared/lib/accessToken";
import { encryptContinewPassword } from "../../shared/lib/passwordEncryption";
import { ResponseValidationError } from "./errors";
import { HttpClient } from "./HttpClient";

const CONTINEW_CLIENT_ID = "ef51c9a3e9046c4f2ea45142c8a8344a";

function decodeLoginToken(value: unknown): string {
  if (!value || typeof value !== "object") {
    throw new ResponseValidationError("登录响应 data 必须是对象");
  }
  const token = (value as { token?: unknown }).token;
  if (typeof token !== "string" || !token.trim()) {
    throw new ResponseValidationError("登录响应缺少有效 token");
  }
  return token;
}

function decodeCaptcha(value: unknown): LoginCaptcha {
  if (!value || typeof value !== "object") {
    throw new ResponseValidationError("验证码响应 data 必须是对象");
  }
  const input = value as Record<string, unknown>;
  if (
    typeof input.uuid !== "string" ||
    typeof input.img !== "string" ||
    typeof input.expireTime !== "number" ||
    typeof input.isEnabled !== "boolean"
  ) {
    throw new ResponseValidationError("验证码响应字段不完整");
  }
  return {
    uuid: input.uuid,
    img: input.img,
    expireTime: input.expireTime,
    isEnabled: input.isEnabled,
  };
}

export class ContinewAuthApi implements AuthApi {
  constructor(private readonly client: HttpClient) {}

  getCaptcha() {
    return this.client.request("/api/continew/captcha/image", {
      decode: decodeCaptcha,
    });
  }

  async login(payload: LoginPayload) {
    clearAccessToken();
    const encryptedPassword = await encryptContinewPassword(payload.password);
    const token = await this.client.request("/api/continew/auth/login", {
      method: "POST",
      body: {
        clientId: CONTINEW_CLIENT_ID,
        authType: "ACCOUNT",
        username: payload.username,
        password: encryptedPassword,
        ...(payload.captcha && payload.uuid
          ? { captcha: payload.captcha, uuid: payload.uuid }
          : {}),
      },
      decode: decodeLoginToken,
    });
    setAccessToken(token);
    return {
      status: "authenticated" as const,
      message: "登录成功，正在进入工作台。",
    };
  }

  async register(payload: RegisterPayload): Promise<RegisterResult> {
    void payload;
    return {
      status: "unavailable",
      message: "注册申请暂未开放，请联系管理员创建账号。",
    };
  }

  async getSession() {
    return null;
  }

  async logout() {
    clearAccessToken();
  }
}
