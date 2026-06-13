import type { ServerResponse } from "node:http";
import { getNaverQuotePayload } from "../../../server/api";
import { apiErrorMessage, apiErrorStatus, getQueryValue, sendJson, type ServerlessRequest } from "../../../server/serverlessUtils";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "GET method is required" });
    return;
  }

  try {
    const symbol = getQueryValue(req.query?.symbol) ?? req.url?.split("?")[0].split("/").filter(Boolean).pop() ?? "";
    const quote = await getNaverQuotePayload(symbol);
    sendJson(res, 200, quote);
  } catch (error) {
    sendJson(res, apiErrorStatus(error, 502), {
      error: apiErrorMessage(error, "Naver delayed quote failed")
    });
  }
}
