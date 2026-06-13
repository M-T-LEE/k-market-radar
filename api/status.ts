import type { ServerResponse } from "node:http";
import { sendJson, type ServerlessRequest } from "../server/serverlessUtils.js";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "GET method is required" });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString()
  });
}
