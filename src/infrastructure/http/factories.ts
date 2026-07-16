import type { AppServices } from "../../app/services";
import { createHttpAppServices } from "./adapters";

export interface ServerHttpAppServicesOptions {
  readonly backendOrigin: string;
  readonly cookieHeader?: string;
  readonly csrfToken?: string;
}

let browserServices: AppServices | undefined;

export function createBrowserHttpAppServices(): AppServices {
  if (typeof window === "undefined") {
    throw new Error("浏览器 HTTP 服务只能在客户端创建");
  }
  browserServices ??= createHttpAppServices({
    baseUrl: "/api/v1",
    onUnauthorized() {
      window.location.assign("/?auth=login#experience");
    },
  });
  return browserServices;
}

export function createServerHttpAppServices(
  options: ServerHttpAppServicesOptions,
): AppServices {
  const backendOrigin = options.backendOrigin.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(backendOrigin)) {
    throw new Error("backendOrigin 必须是完整的 HTTP(S) 地址");
  }
  return createHttpAppServices({
    baseUrl: `${backendOrigin}/api/v1`,
    initialCsrfToken: options.csrfToken,
    defaultHeaders: options.cookieHeader
      ? { Cookie: options.cookieHeader }
      : undefined,
  });
}
