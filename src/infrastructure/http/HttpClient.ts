import {
  HttpApiError,
  ResponseValidationError,
  isApiProblem,
} from "./errors";
import { buildQueryString } from "./query";
import type {
  ApiEnvelope,
  ApiProblem,
  QueryParameters,
} from "./types";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ResponseDecoder<T> = (value: unknown) => T;

export interface HttpClientOptions {
  readonly baseUrl?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly initialCsrfToken?: string;
  readonly defaultHeaders?: Readonly<Record<string, string>>;
  readonly onUnauthorized?: () => void;
}

export interface HttpRequestOptions<T> {
  readonly method?: HttpMethod;
  readonly query?: QueryParameters;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
  readonly headers?: Readonly<Record<string, string>>;
  readonly idempotencyKey?: string;
  readonly decode?: ResponseDecoder<T>;
}

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function isNativeBody(value: unknown): value is BodyInit {
  return (
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) ||
    typeof value === "string" ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}

async function readProblem(response: Response): Promise<ApiProblem> {
  const fallback: ApiProblem = {
    title: response.statusText || "请求失败",
    status: response.status,
    code: `HTTP_${response.status}`,
  };
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return fallback;
  try {
    const payload: unknown = await response.json();
    return isApiProblem(payload) ? payload : fallback;
  } catch {
    return fallback;
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly defaultHeaders: Readonly<Record<string, string>>;
  private readonly onUnauthorized?: () => void;
  private csrfToken?: string;

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "/api/v1";
    this.fetchImplementation =
      options.fetchImplementation ??
      ((input, init) => globalThis.fetch(input, init));
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.csrfToken = options.initialCsrfToken;
    this.onUnauthorized = options.onUnauthorized;
  }

  setCsrfToken(token: string | undefined): void {
    this.csrfToken = token?.trim() || undefined;
  }

  async request<T>(
    path: string,
    options: HttpRequestOptions<T> = {},
  ): Promise<T> {
    const method = options.method ?? "GET";
    const headers = new Headers(this.defaultHeaders);
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      headers.set(name, value);
    }
    headers.set("Accept", "application/json");
    if (options.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }
    if (method !== "GET" && this.csrfToken) {
      headers.set("X-CSRF-Token", this.csrfToken);
    }

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      if (isNativeBody(options.body)) {
        body = options.body;
      } else {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(options.body);
      }
    }

    const response = await this.fetchImplementation(
      `${joinUrl(this.baseUrl, path)}${buildQueryString(options.query)}`,
      {
        method,
        headers,
        body,
        signal: options.signal,
        credentials: "include",
      },
    );

    const csrfToken = response.headers.get("x-csrf-token");
    if (csrfToken) this.setCsrfToken(csrfToken);

    if (!response.ok) {
      if (response.status === 401) this.onUnauthorized?.();
      throw new HttpApiError(await readProblem(response));
    }
    if (response.status === 204) return undefined as T;

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("data" in payload)) {
      throw new ResponseValidationError("接口响应缺少 data 字段");
    }
    const envelope = payload as ApiEnvelope<unknown>;
    return options.decode
      ? options.decode(envelope.data)
      : (envelope.data as T);
  }

  fetchExternal(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this.fetchImplementation(input, {
      ...init,
      credentials: "omit",
    });
  }
}
