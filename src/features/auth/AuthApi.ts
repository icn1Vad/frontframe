export type AuthMode = "login" | "register";
export type RequestedRole = "user" | "admin";

export interface LoginPayload {
  readonly username: string;
  readonly password: string;
}

export interface RegisterPayload {
  readonly username: string;
  readonly password: string;
  readonly requestedRole: RequestedRole;
}

export interface LoginResult {
  readonly status: "authenticated";
  readonly message: string;
}

export interface RegisterResult {
  readonly status: "demo" | "submitted";
  readonly message: string;
}

export interface AuthApi {
  login(payload: LoginPayload): Promise<LoginResult>;
  register(payload: RegisterPayload): Promise<RegisterResult>;
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
