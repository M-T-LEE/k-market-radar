import type { ServerResponse } from "node:http";
import { verifyAdminSession } from "../../server/adminAuth";
import { sendJson, type ServerlessRequest } from "../../server/serverlessUtils";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "GET method is required" });
    return;
  }

  sendJson(res, 200, {
    authenticated: verifyAdminSession(req.headers.cookie)
  });
}
