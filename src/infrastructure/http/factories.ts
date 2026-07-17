import type { AppServices } from "../../app/services";
import type { ReviewTaskPoolApi } from "../../features/documents/application";
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

/**
 * Current Java delivery slice. Classification and knowledge use their complete
 * HTTP ports. Review remains read-only: its mutations stay mock-only and are
 * hidden by the runtime pages.
 */
export function createJavaSliceAppServices(
  fallback: AppServices,
  http: AppServices,
): AppServices {
  const reviewTasks: ReviewTaskPoolApi = Object.freeze({
    list: http.reviewTasks.list.bind(http.reviewTasks),
    getProgress: http.reviewTasks.getProgress.bind(http.reviewTasks),
    getReport: http.reviewTasks.getReport.bind(http.reviewTasks),
    createTerminationReport:
      fallback.reviewTasks.createTerminationReport.bind(fallback.reviewTasks),
    ignoreAllRisks:
      fallback.reviewTasks.ignoreAllRisks.bind(fallback.reviewTasks),
    resolveRisk: fallback.reviewTasks.resolveRisk.bind(fallback.reviewTasks),
    ignoreRisk: fallback.reviewTasks.ignoreRisk.bind(fallback.reviewTasks),
    publish: fallback.reviewTasks.publish.bind(fallback.reviewTasks),
    softDelete: fallback.reviewTasks.softDelete.bind(fallback.reviewTasks),
  });
  return Object.freeze({
    ...fallback,
    auth: http.auth,
    chat: http.chat,
    classification: http.classification,
    classificationTasks: http.classificationTasks,
    contractReview: http.contractReview,
    reviewTasks,
    documents: http.documents,
    knowledge: http.knowledge,
  });
}

export function createBrowserJavaSliceAppServices(
  fallback: AppServices,
): AppServices {
  return createJavaSliceAppServices(fallback, createBrowserHttpAppServices());
}

export function createServerJavaSliceAppServices(
  fallback: AppServices,
  options: ServerHttpAppServicesOptions,
): AppServices {
  return createJavaSliceAppServices(
    fallback,
    createServerHttpAppServices(options),
  );
}
