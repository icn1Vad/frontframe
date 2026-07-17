import {
  createBrowserJavaSliceAppServices,
  createServerJavaSliceAppServices,
} from "../infrastructure/http/factories";
import { appServices, type AppServices } from "./services";

export const javaSliceEnvironmentVariable =
  "NEXT_PUBLIC_PROOFSPACE_JAVA_SLICE";

let browserRuntimeServices: AppServices | undefined;

export function isJavaSliceEnabled(
  value?: string,
): boolean {
  const configuredValue =
    arguments.length === 0
      ? process.env.NEXT_PUBLIC_PROOFSPACE_JAVA_SLICE
      : value;
  return configuredValue?.trim().toLowerCase() === "true";
}

/**
 * Component-level lookup. Server renders keep the mock composition root;
 * data-fetching methods must use createRequestScopedAppServices instead.
 */
export function getRuntimeAppServices(): AppServices {
  if (typeof window === "undefined" || !isJavaSliceEnabled()) {
    return appServices;
  }
  browserRuntimeServices ??= createBrowserJavaSliceAppServices(appServices);
  return browserRuntimeServices;
}

export interface RequestScopedAppServicesOptions {
  readonly backendOrigin?: string;
  readonly cookieHeader?: string;
}

/**
 * Data pages may opt into Java SSR only through a freshly created
 * request-scoped client. If the internal backend origin is absent, keep the
 * existing mock SSR path rather than constructing a shared service.
 */
export function createRequestScopedAppServices(
  options: RequestScopedAppServicesOptions,
): AppServices {
  if (!isJavaSliceEnabled() || !options.backendOrigin) {
    return appServices;
  }
  return createServerJavaSliceAppServices(appServices, {
    backendOrigin: options.backendOrigin,
    cookieHeader: options.cookieHeader,
  });
}
