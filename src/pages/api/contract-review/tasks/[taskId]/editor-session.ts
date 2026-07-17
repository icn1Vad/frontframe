import type { NextApiRequest, NextApiResponse } from "next";
import type { ContractEditorSession } from "../../../../../features/contracts/domain";

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse<ContractEditorSession | { error: string }>,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "不支持该请求方法" });
    return;
  }

  response.status(200).json({
    provider: "mock",
    reason: "真实 WPS 会话只能由已认证的 Java API 动态签发",
  });
}
