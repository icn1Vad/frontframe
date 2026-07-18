export const accessTokenStorageKey = "proofspace_access_token";

export function getAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(accessTokenStorageKey)?.trim() || undefined;
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  const normalized = token.trim();
  if (!normalized) {
    throw new Error("登录令牌不能为空");
  }
  window.sessionStorage.setItem(accessTokenStorageKey, normalized);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(accessTokenStorageKey);
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}
