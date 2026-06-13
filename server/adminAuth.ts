import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { loadServerEnv, type ServerEnv } from "./runtimeEnv";

const ADMIN_COOKIE_NAME = "k_market_radar_admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type AdminSessionPayload = {
  role: "admin";
  exp: number;
};

type AdminLoginResult =
  | { ok: true; cookie: string; body: { authenticated: true } }
  | { ok: false; status: number; body: { authenticated: false; error: string } };

function safeCompare(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function shouldUseSecureCookie(env: ServerEnv) {
  return env.VERCEL === "1" || env.NODE_ENV === "production";
}

function serializeCookie(name: string, value: string, options: { maxAge: number; env: ServerEnv }) {
  const parts = [
    `${name}=${value}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${options.maxAge}`,
    "SameSite=Lax"
  ];

  if (shouldUseSecureCookie(options.env)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function parseCookieHeader(cookieHeader = "") {
  return cookieHeader.split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName) {
      cookies[rawName] = rawValue.join("=");
    }
    return cookies;
  }, {});
}

export function createAdminLoginResult(password: string, env = loadServerEnv()): AdminLoginResult {
  const expectedPassword = env.ADMIN_PASSWORD;
  const sessionSecret = env.ADMIN_SESSION_SECRET;

  if (!expectedPassword || !sessionSecret) {
    return {
      ok: false,
      status: 503,
      body: {
        authenticated: false,
        error: "관리자 인증 환경변수가 설정되지 않았습니다."
      }
    };
  }

  if (!password || !safeCompare(password, expectedPassword)) {
    return {
      ok: false,
      status: 401,
      body: {
        authenticated: false,
        error: "관리자 비밀번호가 올바르지 않습니다."
      }
    };
  }

  const payload: AdminSessionPayload = {
    role: "admin",
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };
  const payloadValue = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(payloadValue, sessionSecret);
  const cookie = serializeCookie(ADMIN_COOKIE_NAME, `${payloadValue}.${signature}`, {
    maxAge: SESSION_MAX_AGE_SECONDS,
    env
  });

  return {
    ok: true,
    cookie,
    body: { authenticated: true }
  };
}

export function createAdminLogoutCookie(env = loadServerEnv()) {
  return serializeCookie(ADMIN_COOKIE_NAME, "", {
    maxAge: 0,
    env
  });
}

export function verifyAdminSession(cookieHeader?: string, env = loadServerEnv()) {
  const sessionSecret = env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) return false;

  const rawCookie = parseCookieHeader(cookieHeader)[ADMIN_COOKIE_NAME];
  if (!rawCookie) return false;

  const [payloadValue, signature] = rawCookie.split(".");
  if (!payloadValue || !signature) return false;

  const expectedSignature = signPayload(payloadValue, sessionSecret);
  if (!safeCompare(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadValue, "base64url").toString("utf8")) as AdminSessionPayload;
    return payload.role === "admin" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
