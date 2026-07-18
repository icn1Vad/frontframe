export interface ApiFieldError {
  readonly field: string;
  readonly message: string;
  readonly code?: string;
}

export interface ApiProblem {
  readonly type?: string;
  readonly title: string;
  readonly status: number;
  readonly code: string;
  readonly detail?: string;
  readonly traceId?: string;
  readonly retryable?: boolean;
  readonly fieldErrors?: readonly ApiFieldError[];
}

export interface ApiEnvelope<T> {
  readonly code: string;
  readonly msg: string;
  readonly success: boolean;
  readonly timestamp: number;
  readonly data: T;
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

export type QueryParameters = Readonly<Record<string, QueryValue>>;

export interface PresignedUploadSession {
  readonly uploadId: string;
  readonly uploadUrl: string;
  readonly method: "PUT";
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
}

export interface UploadedFileResource {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly contentType: string;
  readonly status: "ready";
  readonly createdAt: string;
}
