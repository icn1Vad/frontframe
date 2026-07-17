import { clearAccessToken } from "../shared/lib/accessToken";

export interface AppSession {
  readonly user: {
    readonly displayName: string;
    readonly roleLabel: string;
  };
  readonly signOut?: () => void;
}

/** Fallback presentation until the authenticated user profile endpoint is connected. */
export const defaultSession: AppSession = {
  user: {
    displayName: "用户",
    roleLabel: "已登录",
  },
  signOut() {
    if (typeof window !== "undefined") {
      clearAccessToken();
      window.location.assign("/?auth=login#experience");
    }
  },
};
