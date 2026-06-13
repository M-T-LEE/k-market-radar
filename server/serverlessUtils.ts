import type { IncomingMessage, ServerResponse } from "node:http";
import { ApiRouteError } from "./apiError";

export type ServerlessRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function readJsonRequestBody<T = any>(req: ServerlessRequest): Promise<T> {
  if (typeof req.body === "object" && req.body !== null) {
    return req.body as T;
  }

  if (typeof req.body === "string") {
    return JSON.parse(req.body) as T;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) as T : {} as T;
}

export function apiErrorStatus(error: unknown, fallbackStatus = 500) {
  return error instanceof ApiRouteError ? error.status : fallbackStatus;
}

export function apiErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}
