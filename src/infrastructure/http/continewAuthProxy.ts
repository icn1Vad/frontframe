export type ProxyHeaderSource = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

const allowedRoutes = new Map<string, string>([
  ["GET captcha/image", "/captcha/image"],
  ["POST auth/login", "/auth/login"],
]);

function firstHeaderValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

export function resolveContinewAuthRoute(
  path: string | readonly string[] | undefined,
  method: string | undefined,
): string | undefined {
  const segments = Array.isArray(path) ? path : path ? [path] : [];
  return allowedRoutes.get(`${method?.toUpperCase() ?? ""} ${segments.join("/")}`);
}

export function buildContinewAuthHeaders(
  source: ProxyHeaderSource,
): Headers {
  const headers = new Headers();
  headers.set("Accept", firstHeaderValue(source.accept) ?? "application/json");
  headers.set(
    "Content-Type",
    firstHeaderValue(source["content-type"]) ?? "application/json",
  );
  return headers;
}
