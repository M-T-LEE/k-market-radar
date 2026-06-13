import type { ServerResponse } from "node:http";
import { createAdminLogoutCookie } from "../../server/adminAuth";
import { sendJson, type ServerlessRequest } from "../../server/serverlessUtils";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST method is required" });
    return;
  }

  res.setHeader("Set-Cookie", createAdminLogoutCookie());
  sendJson(res, 200, { authenticated: false });
}
