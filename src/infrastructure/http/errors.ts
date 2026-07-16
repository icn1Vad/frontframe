import type { ApiFieldError, ApiProblem } from "./types";

export class HttpApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId?: string;
  readonly retryable: boolean;
  readonly fieldErrors: readonly ApiFieldError[];

  constructor(problem: ApiProblem) {
    super(problem.detail ?? problem.title);
    this.name = "HttpApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.traceId = problem.traceId;
    this.retryable =
      problem.retryable ??
      (
        problem.status === 408 ||
        problem.status === 425 ||
        problem.status === 429 ||
        problem.status >= 500
      );
    this.fieldErrors = problem.fieldErrors ?? [];
  }
}

export class ResponseValidationError extends Error {
  readonly code = "INVALID_API_RESPONSE";

  constructor(message: string) {
    super(message);
    this.name = "ResponseValidationError";
  }
}

export function isApiProblem(value: unknown): value is ApiProblem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ApiProblem>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.status === "number" &&
    typeof candidate.code === "string"
  );
}
