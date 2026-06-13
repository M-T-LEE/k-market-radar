import type { ServerResponse } from "node:http";
import { verifyAdminSession } from "../../server/adminAuth.js";
import { sendJson, type ServerlessRequest } from "../../server/serverlessUtils.js";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "GET method is required" });
    return;
  }

  res.setHeader("Cache-Control", "no-store, max-age=0");
  sendJson(res, 200, {
    authenticated: verifyAdminSession(req.headers.cookie)
  });
}
