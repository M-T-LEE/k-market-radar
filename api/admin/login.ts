import type { ServerResponse } from "node:http";
import { createAdminLoginResult } from "../../server/adminAuth";
import { apiErrorMessage, readJsonRequestBody, sendJson, type ServerlessRequest } from "../../server/serverlessUtils";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST method is required" });
    return;
  }

  try {
    const body = await readJsonRequestBody<{ password?: string }>(req);
    const result = createAdminLoginResult(String(body.password ?? ""));

    if (!result.ok) {
      sendJson(res, result.status, result.body);
      return;
    }

    res.setHeader("Set-Cookie", result.cookie);
    sendJson(res, 200, result.body);
  } catch (error) {
    sendJson(res, 400, {
      authenticated: false,
      error: apiErrorMessage(error, "관리자 로그인 요청을 처리하지 못했습니다.")
    });
  }
}
