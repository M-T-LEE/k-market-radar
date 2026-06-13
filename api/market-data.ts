import { buildMarketDataSnapshot } from "../server/api";
import { apiErrorMessage, sendJson, type ServerlessRequest } from "../server/serverlessUtils";
import type { ServerResponse } from "node:http";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "GET method is required" });
    return;
  }

  try {
    const data = await buildMarketDataSnapshot();
    sendJson(res, 200, data);
  } catch (error) {
    sendJson(res, 500, {
      error: apiErrorMessage(error, "Unknown market data error")
    });
  }
}
