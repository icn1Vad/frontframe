import type { NextApiRequest, NextApiResponse } from "next";
import type { ContractEditorSession } from "../../../../../features/contracts/domain";

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sessionUrl(template: string, taskId: string): string {
  if (template.includes("{taskId}")) {
    return template.replace("{taskId}", encodeURIComponent(taskId));
  }
  return `${template.replace(/\/$/, "")}/${encodeURIComponent(taskId)}/editor-session`;
}

function localWpsSession(taskId: string): ContractEditorSession | undefined {
  const sdkUrl = process.env.WPS_WEB_OFFICE_SDK_URL?.trim();
  const appId = process.env.WPS_WEB_OFFICE_APP_ID?.trim();
  if (!sdkUrl || !appId) return undefined;

  const configuredFileId = process.env.WPS_WEB_OFFICE_FILE_ID?.trim();
  const fileId = configuredFileId || taskId.replace(/[^a-zA-Z0-9]/g, "");
  const token = process.env.WPS_WEB_OFFICE_TOKEN?.trim();
  const timeout = Number.parseInt(
    process.env.WPS_WEB_OFFICE_TOKEN_TIMEOUT_MS ?? "600000",
    10,
  );

  return {
    provider: "wps",
    sdkUrl,
    appId,
    fileId,
    token: token
      ? { token, timeout: Number.isFinite(timeout) ? timeout : 600000 }
      : undefined,
    endpoint: process.env.WPS_WEB_OFFICE_ENDPOINT?.trim() || undefined,
    mode: process.env.WPS_WEB_OFFICE_MODE === "simple" ? "simple" : "normal",
    readonly: process.env.WPS_WEB_OFFICE_READONLY === "true",
    customArgs: { ps_task_id: taskId },
  };
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<ContractEditorSession | { error: string } | string>,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "不支持该请求方法" });
    return;
  }

  const taskId = single(request.query.taskId);
  if (!taskId) {
    response.status(400).json({ error: "缺少合同审查任务标识" });
    return;
  }

  const upstream = process.env.CONTRACT_EDITOR_SESSION_ENDPOINT?.trim();
  if (upstream) {
    try {
      const upstreamResponse = await fetch(sessionUrl(upstream, taskId), {
        headers: {
          Accept: "application/json",
          ...(process.env.CONTRACT_EDITOR_SESSION_TOKEN
            ? { Authorization: `Bearer ${process.env.CONTRACT_EDITOR_SESSION_TOKEN}` }
            : {}),
        },
      });
      const body = await upstreamResponse.text();
      response.status(upstreamResponse.status);
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.send(body);
      return;
    } catch {
      response.status(502).json({ error: "在线编辑器会话服务暂不可用" });
      return;
    }
  }

  const configuredSession = localWpsSession(taskId);
  response.status(200).json(
    configuredSession ?? {
      provider: "mock",
      reason: "在线编辑器尚未完成配置，当前使用文本预览",
    },
  );
}
