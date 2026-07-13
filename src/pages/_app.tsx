import type { AppProps } from "next/app";
import { AppShell, type AppPage } from "../app";
import "../styles/globals.css";

type AppPropsWithPageConfig = AppProps & {
  Component: AppPage<Record<string, unknown>>;
};

export default function App({ Component, pageProps }: AppPropsWithPageConfig) {
  const page = <Component {...pageProps} />;
  return Component.pageConfig ? (
    <AppShell config={Component.pageConfig}>{page}</AppShell>
  ) : (
    page
  );
}
