import type { IncomingHttpHeaders } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildContinewProxyHeaders,
  resolveContinewProxyRoute,
} from "../../../infrastructure/http/continewAuthProxy";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

function sendProxyError(
  response: NextApiResponse,
  status: number,
  message: string,
): void {
  if (response.headersSent) {
    response.end();
    return;
  }
  response.status(status).json({
    code: String(status),
    msg: message,
    success: false,
    timestamp: Date.now(),
    data: null,
  });
}

function copyResponseHeaders(
  headers: IncomingHttpHeaders,
  response: NextApiResponse,
): void {
  const allowed = [
    "cache-control",
    "content-disposition",
    "content-length",
    "content-type",
    "etag",
    "last-modified",
    "retry-after",
    "x-csrf-token",
    "x-trace-id",
  ] as const;
  for (const name of allowed) {
    const value = headers[name];
    if (value !== undefined) response.setHeader(name, value);
  }
  if (!headers["cache-control"]) response.setHeader("Cache-Control", "no-store");
}

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse,
): void {
  const upstreamPath = resolveContinewProxyRoute(
    request.query.path,
    request.method,
  );
  if (!upstreamPath) {
    sendProxyError(response, 404, "代理路径不存在");
    return;
  }

  const backendOrigin = process.env.API_BACKEND_ORIGIN?.replace(/\/+$/, "");
  if (!backendOrigin) {
    sendProxyError(response, 503, "后端服务地址未配置");
    return;
  }

  let upstreamUrl: URL;
  try {
    const query = new URL(request.url ?? "", "http://localhost").search;
    upstreamUrl = new URL(`${upstreamPath}${query}`, `${backendOrigin}/`);
  } catch {
    sendProxyError(response, 503, "后端服务地址无效");
    return;
  }

  const transport = upstreamUrl.protocol === "https:" ? httpsRequest : httpRequest;
  const upstreamRequest = transport(upstreamUrl, {
    method: request.method,
    headers: buildContinewProxyHeaders(request.headers),
  }, (upstreamResponse) => {
    response.statusCode = upstreamResponse.statusCode ?? 502;
    copyResponseHeaders(upstreamResponse.headers, response);
    upstreamResponse.on("error", () => response.destroy());
    response.once("close", () => upstreamResponse.destroy());
    upstreamResponse.pipe(response);
  });

  upstreamRequest.on("error", () => {
    sendProxyError(response, 502, "后端服务暂不可用");
  });
  request.on("aborted", () => upstreamRequest.destroy());
  request.pipe(upstreamRequest);
}
