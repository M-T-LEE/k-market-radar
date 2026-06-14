import { buildMarketDataSnapshot } from "../server/api.js";
import { apiErrorMessage, sendJson, type ServerlessRequest } from "../server/serverlessUtils.js";
import type { ServerResponse } from "node:http";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "GET method is required" });
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/api/market-data", "http://localhost");
    const fast = requestUrl.searchParams.get("mode") === "fast" || requestUrl.searchParams.get("fast") === "1";
    const data = await buildMarketDataSnapshot({ fast });
    res.setHeader("Cache-Control", fast ? "s-maxage=60, stale-while-revalidate=300" : "s-maxage=300, stale-while-revalidate=900");
    sendJson(res, 200, data);
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    sendJson(res, 500, {
      error: apiErrorMessage(error, "Unknown market data error")
    });
  }
}
