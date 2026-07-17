import type { NextApiRequest, NextApiResponse } from "next";
import {
  buildContinewAuthHeaders,
  resolveContinewAuthRoute,
} from "../../../infrastructure/http/continewAuthProxy";

function sendProxyError(
  response: NextApiResponse,
  status: number,
  message: string,
): void {
  response.status(status).json({
    code: String(status),
    msg: message,
    success: false,
    timestamp: Date.now(),
    data: null,
  });
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
): Promise<void> {
  const upstreamPath = resolveContinewAuthRoute(
    request.query.path,
    request.method,
  );
  if (!upstreamPath) {
    sendProxyError(response, 404, "登录代理路径不存在");
    return;
  }

  const backendOrigin = process.env.API_BACKEND_ORIGIN?.replace(/\/+$/, "");
  if (!backendOrigin) {
    sendProxyError(response, 503, "登录服务地址未配置");
    return;
  }

  try {
    const upstreamResponse = await fetch(`${backendOrigin}${upstreamPath}`, {
      method: request.method,
      headers: buildContinewAuthHeaders(request.headers),
      body: request.method === "GET"
        ? undefined
        : typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body),
      redirect: "manual",
    });
    const contentType = upstreamResponse.headers.get("content-type");
    const traceId = upstreamResponse.headers.get("x-trace-id");
    if (contentType) response.setHeader("Content-Type", contentType);
    if (traceId) response.setHeader("X-Trace-Id", traceId);
    response.setHeader("Cache-Control", "no-store");

    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    response.status(upstreamResponse.status).send(responseBody);
  } catch {
    sendProxyError(response, 502, "登录服务暂不可用");
  }
}
