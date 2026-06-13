import type { ServerResponse } from "node:http";
import { apiErrorMessage, apiErrorStatus, readJsonRequestBody, sendJson, type ServerlessRequest } from "../server/serverlessUtils";
import { getTechnicalSignalsPayload } from "../server/api";
import type { TechnicalSignalKind } from "../src/types/stock";

export default async function handler(req: ServerlessRequest, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "POST method is required" });
    return;
  }

  try {
    const body = await readJsonRequestBody<{
      symbols?: string[];
      kind?: TechnicalSignalKind;
      windowDays?: number;
    }>(req);
    const data = await getTechnicalSignalsPayload(body);
    sendJson(res, 200, data);
  } catch (error) {
    sendJson(res, apiErrorStatus(error), {
      error: apiErrorMessage(error, "Technical signal verification failed")
    });
  }
}
