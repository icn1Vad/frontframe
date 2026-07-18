import type {
  AuthApi,
  AuthSession,
  LoginCaptcha,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
} from "../../features/auth";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../../shared/lib/accessToken";
import { encryptContinewPassword } from "../../shared/lib/passwordEncryption";
import { ResponseValidationError } from "./errors";
import { HttpClient } from "./HttpClient";

const CONTINEW_CLIENT_ID = "ef51c9a3e9046c4f2ea45142c8a8344a";

interface ContinewUserInfo {
  readonly id: string;
  readonly username: string;
  readonly nickname: string;
  readonly permissions: readonly string[];
  readonly roles: readonly string[];
  readonly roleNames: readonly string[];
}

function requiredString(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ResponseValidationError(`用户信息缺少有效 ${field}`);
  }
  return value.trim();
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ResponseValidationError(`用户信息 ${field} 字段无效`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function decodeUserInfo(value: unknown): ContinewUserInfo {
  if (!value || typeof value !== "object") {
    throw new ResponseValidationError("用户信息 data 必须是对象");
  }
  const input = value as Record<string, unknown>;
  const id = typeof input.id === "number"
    ? String(input.id)
    : requiredString(input.id, "id");
  const username = requiredString(input.username, "username");
  const nickname = typeof input.nickname === "string" && input.nickname.trim()
    ? input.nickname.trim()
    : username;
  return {
    id,
    username,
    nickname,
    permissions: stringArray(input.permissions, "permissions"),
    roles: stringArray(input.roles, "roles"),
    roleNames: stringArray(input.roleNames, "roleNames"),
  };
}

function toAuthSession(user: ContinewUserInfo): AuthSession {
  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.nickname,
      roleLabel: user.roleNames.join("、") || user.roles.join("、") || "已登录",
      permissions: user.permissions,
    },
  };
}

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
  private verifiedToken?: string;
  private verifiedSession?: AuthSession;

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
    try {
      const session = await this.loadSession(token);
      if (session.user.username !== payload.username) {
        throw new ResponseValidationError(
          `登录身份不一致：输入账号为 ${payload.username}，Token 对应账号为 ${session.user.username}`,
        );
      }
      return {
        status: "authenticated" as const,
        message: "身份验证成功，正在进入工作台。",
        session,
      };
    } catch (error) {
      this.clearVerifiedSession();
      clearAccessToken();
      throw error;
    }
  }

  async register(payload: RegisterPayload): Promise<RegisterResult> {
    void payload;
    return {
      status: "unavailable",
      message: "注册申请暂未开放，请联系管理员创建账号。",
    };
  }

  async getSession(): Promise<AuthSession | null> {
    const token = getAccessToken();
    if (!token) {
      this.clearVerifiedSession();
      return null;
    }
    if (token === this.verifiedToken && this.verifiedSession) {
      return this.verifiedSession;
    }
    try {
      return await this.loadSession(token);
    } catch (error) {
      this.clearVerifiedSession();
      clearAccessToken();
      throw error;
    }
  }

  async logout() {
    this.clearVerifiedSession();
    clearAccessToken();
  }

  private async loadSession(token: string): Promise<AuthSession> {
    const user = await this.client.request<ContinewUserInfo>(
      "/auth/user/info",
      {
        headers: { Authorization: `Bearer ${token}` },
        decode: decodeUserInfo,
      },
    );
    const session = toAuthSession(user);
    this.verifiedToken = token;
    this.verifiedSession = session;
    return session;
  }

  private clearVerifiedSession(): void {
    this.verifiedToken = undefined;
    this.verifiedSession = undefined;
  }
}
