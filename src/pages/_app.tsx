import type { AppProps } from "next/app";
import { useEffect, useMemo, useState } from "react";
import type { AuthSession } from "../features/auth";
import {
  AppShell,
  appServices,
  type AppPage,
  type AppSession,
} from "../app";
import "../styles/globals.css";

type AppPropsWithPageConfig = AppProps & {
  Component: AppPage<Record<string, unknown>>;
};

export default function App({ Component, pageProps }: AppPropsWithPageConfig) {
  const page = <Component {...pageProps} />;
  const requiresSession = Boolean(Component.pageConfig);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(requiresSession);

  useEffect(() => {
    if (!requiresSession) {
      setCheckingSession(false);
      return;
    }

    let active = true;
    setCheckingSession(true);
    void appServices.auth.getSession()
      .then((session) => {
        if (!active) return;
        if (!session) {
          window.location.assign("/?auth=login#experience");
          return;
        }
        setAuthSession(session);
        setCheckingSession(false);
      })
      .catch(() => {
        if (!active) return;
        window.location.assign("/?auth=login#experience");
      });

    return () => {
      active = false;
    };
  }, [requiresSession]);

  const appSession = useMemo<AppSession | undefined>(() => {
    if (!authSession) return undefined;
    return {
      user: {
        displayName: authSession.user.displayName,
        roleLabel: authSession.user.roleLabel,
      },
      signOut() {
        void appServices.auth.logout().finally(() => {
          window.location.assign("/?auth=login#experience");
        });
      },
    };
  }, [authSession]);

  if (!Component.pageConfig) return page;
  if (checkingSession || !appSession) {
    return (
      <main className="auth-session-loading" role="status" aria-live="polite">
        正在验证登录身份…
      </main>
    );
  }
  return (
    <AppShell config={Component.pageConfig} session={appSession}>
      {page}
    </AppShell>
  );
}
