export interface AppSession {
  readonly user: {
    readonly displayName: string;
    readonly roleLabel: string;
  };
  readonly signOut?: () => void;
}

/** Demo composition value. Replace this object when the authentication port is connected. */
export const demoSession: AppSession = {
  user: {
    displayName: "严凯丰",
    roleLabel: "管理员",
  },
};

