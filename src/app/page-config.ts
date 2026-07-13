import type { NextPage } from "next";
import type { AppModuleId } from "./module-registry";

export interface AppPageConfig {
  readonly moduleId: AppModuleId;
  readonly activeModuleId?: AppModuleId;
  readonly title?: string;
  readonly subtitle?: string;
}

export type AppPage<Props = Record<string, never>, InitialProps = Props> =
  NextPage<Props, InitialProps> & {
    pageConfig?: AppPageConfig;
  };

export function definePageConfig(config: AppPageConfig): AppPageConfig {
  return Object.freeze({ ...config });
}

