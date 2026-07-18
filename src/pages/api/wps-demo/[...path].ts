import type { NextApiRequest, NextApiResponse } from "next";

interface WpsEnvelope {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

const fileId = process.env.WPS_WEB_OFFICE_FILE_ID?.trim()
  || "proofspace_demo_contract";
const fileName = "测试合同.docx";
const fileSize = 13_218;
const demoUserId = "10001";

function pathSegments(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function ok(response: NextApiResponse<WpsEnvelope>, data: unknown) {
  response.status(200).json({ code: 0, message: "", data });
}

function fileDownloadUrl(request: NextApiRequest): string {
  const configured = process.env.WPS_DEMO_FILE_URL?.trim();
  if (configured) return configured;
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
    || request.headers.host
    || "proofreading.cortexdata.cn";
  return `https://${host}/demo/wps/test-contract.docx`;
}

export default function handler(
  request: NextApiRequest,
  response: NextApiResponse<WpsEnvelope>,
) {
  response.setHeader("Cache-Control", "no-store");
  const segments = pathSegments(request.query.path);

  if (request.method !== "GET") {
    response.status(405).json({ code: 40005, message: "demo callback is read-only" });
    return;
  }

  if (segments[0] === "files" && segments[1] === fileId) {
    const action = segments[2];
    if (!action) {
      ok(response, {
        id: fileId,
        name: fileName,
        version: 1,
        size: fileSize,
        create_time: 1_784_275_200,
        modify_time: 1_784_275_200,
        creator_id: demoUserId,
        modifier_id: demoUserId,
      });
      return;
    }
    if (action === "download") {
      ok(response, {
        url: fileDownloadUrl(request),
        digest: null,
        digest_type: null,
        headers: {},
      });
      return;
    }
    if (action === "permission") {
      ok(response, {
        user_id: demoUserId,
        read: 1,
        update: 1,
        download: 0,
        rename: 0,
        history: 0,
        copy: 0,
        print: 0,
        saveas: 0,
        comment: 0,
      });
      return;
    }
  }

  if (segments.length === 1 && segments[0] === "users") {
    const requested = request.query.user_ids;
    const ids = (Array.isArray(requested) ? requested : [requested])
      .filter((value): value is string => Boolean(value));
    ok(response, (ids.length ? ids : [demoUserId]).map((id) => ({
      id,
      name: "WPS 演示用户",
      avatar_url: null,
    })));
    return;
  }

  response.status(404).json({ code: 40004, message: "demo file not found" });
}
