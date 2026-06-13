import type { ServerResponse } from "node:http";
import { createAdminLogoutCookie } from "../../server/adminAuth.js";
import { sendJson, type ServerlessRequest } from "../../server/serverlessUtils.js";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST method is required" });
    return;
  }

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Set-Cookie", createAdminLogoutCookie());
  sendJson(res, 200, { authenticated: false });
}
