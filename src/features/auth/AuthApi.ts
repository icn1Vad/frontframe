export type AuthMode = "login" | "register";
export type RequestedRole = "user" | "admin";

export interface LoginPayload {
  readonly username: string;
  readonly password: string;
  readonly captcha?: string;
  readonly uuid?: string;
}

export interface LoginCaptcha {
  readonly uuid: string;
  readonly img: string;
  readonly expireTime: number;
  readonly isEnabled: boolean;
}

export interface AuthUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly roleLabel: string;
  readonly permissions: readonly string[];
}

export interface AuthSession {
  readonly user: AuthUser;
  readonly expiresAt?: string;
  readonly csrfToken?: string;
}

export interface RegisterPayload {
  readonly username: string;
  readonly password: string;
  readonly requestedRole: RequestedRole;
}

export interface LoginResult {
  readonly status: "authenticated";
  readonly message: string;
  readonly session?: AuthSession;
}

export interface RegisterResult {
  readonly status: "submitted" | "unavailable";
  readonly message: string;
}

export interface AuthApi {
  getCaptcha?(): Promise<LoginCaptcha>;
  login(payload: LoginPayload): Promise<LoginResult>;
  register(payload: RegisterPayload): Promise<RegisterResult>;
  getSession(): Promise<AuthSession | null>;
  logout(): Promise<void>;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code: "validation" | "unauthorized" | "unavailable" = "unavailable",
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}
