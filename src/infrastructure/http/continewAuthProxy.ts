export type ProxyHeaderSource = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

const exactRoutes = new Map<string, string>([
  ["GET captcha/image", "/captcha/image"],
  ["POST auth/login", "/auth/login"],
  ["GET auth/user/info", "/auth/user/info"],
  ["POST business/documents", "/business/documents"],
  ["GET business/review/tasks", "/business/review/tasks"],
  ["POST business/review/tasks", "/business/review/tasks"],
  ["GET business/contract-reviews/tasks", "/business/contract-reviews/tasks"],
  ["POST business/contract-reviews/tasks", "/business/contract-reviews/tasks"],
  ["GET business/chat/conversations", "/business/chat/conversations"],
  ["POST business/chat/conversations", "/business/chat/conversations"],
]);

const dynamicRoutes: readonly {
  readonly method: string;
  readonly pattern: RegExp;
}[] = [
  { method: "GET", pattern: /^business\/review\/tasks\/[^/]+(?:\/result)?$/ },
  { method: "GET", pattern: /^business\/contract-reviews\/tasks\/[^/]+(?:\/result)?$/ },
  { method: "DELETE", pattern: /^business\/chat\/conversations\/[^/]+$/ },
  { method: "GET", pattern: /^business\/chat\/conversations\/[^/]+\/messages$/ },
  { method: "POST", pattern: /^business\/chat\/conversations\/[^/]+\/messages\/stream$/ },
];

const forwardedRequestHeaders = [
  "accept",
  "authorization",
  "content-encoding",
  "content-length",
  "content-type",
  "idempotency-key",
  "if-match",
  "last-event-id",
  "x-csrf-token",
] as const;

function firstHeaderValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

export function resolveContinewProxyRoute(
  path: string | readonly string[] | undefined,
  method: string | undefined,
): string | undefined {
  const segments = Array.isArray(path) ? path : path ? [path] : [];
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return undefined;
  }
  const normalizedMethod = method?.toUpperCase() ?? "";
  const joinedPath = segments.join("/");
  const exact = exactRoutes.get(`${normalizedMethod} ${joinedPath}`);
  if (exact) return exact;
  const dynamic = dynamicRoutes.some(
    (route) => route.method === normalizedMethod && route.pattern.test(joinedPath),
  );
  return dynamic ? `/${joinedPath}` : undefined;
}

export function buildContinewProxyHeaders(
  source: ProxyHeaderSource,
): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (const name of forwardedRequestHeaders) {
    const value = firstHeaderValue(source[name]);
    if (value) headers[name] = value;
  }
  if (!headers.accept) headers.accept = "application/json";
  return headers;
}

// Backwards-compatible aliases for the existing authentication tests/imports.
export const resolveContinewAuthRoute = resolveContinewProxyRoute;
export const buildContinewAuthHeaders = buildContinewProxyHeaders;
