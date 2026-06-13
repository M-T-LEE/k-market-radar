import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ServerEnv = Record<string, string | undefined>;

export function loadServerEnv(): ServerEnv {
  const envPath = resolve(process.cwd(), ".env.local");
  const entries: ServerEnv = {};

  try {
    const contents = readFileSync(envPath, "utf8");
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .forEach((line) => {
        const index = line.indexOf("=");
        if (index > -1) {
          entries[line.slice(0, index)] = line.slice(index + 1);
        }
      });
  } catch {
    return process.env as ServerEnv;
  }

  return { ...(process.env as ServerEnv), ...entries };
}
