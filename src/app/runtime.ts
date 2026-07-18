import { clearAccessToken } from "../shared/lib/accessToken";

export interface AppSession {
  readonly user: {
    readonly displayName: string;
    readonly roleLabel: string;
  };
  readonly signOut?: () => void;
}

/** Test/story fallback. Production pages receive a verified Java user session. */
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
