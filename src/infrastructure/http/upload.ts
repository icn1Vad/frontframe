import { HttpApiError } from "./errors";
import type { HttpClient } from "./HttpClient";
import type {
  PresignedUploadSession,
  UploadedFileResource,
} from "./types";

export interface UploadFileOptions {
  readonly idempotencyKey: string;
  readonly signal?: AbortSignal;
}

export async function uploadFileToObjectStorage(
  client: HttpClient,
  file: File,
  options: UploadFileOptions,
): Promise<UploadedFileResource> {
  const session = await client.request<PresignedUploadSession>(
    "/uploads/initiate",
    {
      method: "POST",
      body: {
        fileName: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
        lastModified: file.lastModified,
      },
      idempotencyKey: `${options.idempotencyKey}:initiate`,
      signal: options.signal,
    },
  );

  const uploadHeaders = new Headers(session.headers);
  if (!uploadHeaders.has("Content-Type")) {
    uploadHeaders.set(
      "Content-Type",
      file.type || "application/octet-stream",
    );
  }
  const uploadResponse = await client.fetchExternal(session.uploadUrl, {
    method: session.method,
    headers: uploadHeaders,
    body: file,
    signal: options.signal,
  });
  if (!uploadResponse.ok) {
    throw new HttpApiError({
      title: "文件传输失败",
      status: uploadResponse.status,
      code: "UPLOAD_TRANSFER_FAILED",
      detail: "文件未能写入对象存储，请重新上传。",
      retryable: uploadResponse.status >= 500,
    });
  }

  return client.request<UploadedFileResource>(
    `/uploads/${encodeURIComponent(session.uploadId)}/complete`,
    {
      method: "POST",
      body: {
        etag: uploadResponse.headers.get("etag") ?? undefined,
      },
      idempotencyKey: `${options.idempotencyKey}:complete`,
      signal: options.signal,
    },
  );
}

export async function uploadFilesToObjectStorage(
  client: HttpClient,
  files: readonly File[],
  options: UploadFileOptions,
): Promise<readonly UploadedFileResource[]> {
  return Promise.all(
    files.map((file, index) =>
      uploadFileToObjectStorage(client, file, {
        ...options,
        idempotencyKey: `${options.idempotencyKey}:${index}`,
      }),
    ),
  );
}
