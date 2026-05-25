import {
  DASHBOARD_SESSION_COOKIE,
  getDashboardSessionSecret,
  isDashboardPasswordAuthConfigured
} from "@/lib/authConfig";

const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

type CookieSameSite = "lax" | "strict" | "none";

export type DashboardSessionVerification = {
  valid: boolean;
  expiresAt?: number;
  reason?: "missing" | "setup" | "malformed" | "expired" | "invalid";
};

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
}

export function getSessionCookieOptions(maxAge = SESSION_DURATION_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as CookieSameSite,
    path: "/",
    maxAge
  };
}

export function getExpiredSessionCookieOptions() {
  return getSessionCookieOptions(0);
}

export async function createDashboardSessionCookieValue(): Promise<{ value: string; expiresAt: number }> {
  const secret = getDashboardSessionSecret();

  if (!secret || !isDashboardPasswordAuthConfigured()) {
    throw new Error("Dashboard password authentication is not configured.");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_DURATION_SECONDS;
  const payload = `v1.${issuedAt}.${expiresAt}.${createNonce()}`;
  const signature = await signPayload(payload, secret);

  return {
    value: `${payload}.${signature}`,
    expiresAt
  };
}

export async function verifyDashboardSession(cookieValue?: string | null): Promise<DashboardSessionVerification> {
  const secret = getDashboardSessionSecret();

  if (!secret || !isDashboardPasswordAuthConfigured()) {
    return { valid: false, reason: "setup" };
  }

  if (!cookieValue) {
    return { valid: false, reason: "missing" };
  }

  const parts = cookieValue.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") {
    return { valid: false, reason: "malformed" };
  }

  const expiresAt = Number(parts[2]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "expired" };
  }

  const payload = parts.slice(0, 4).join(".");
  const signature = parts[4];
  const expectedSignature = await signPayload(payload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return { valid: false, reason: "invalid" };
  }

  return { valid: true, expiresAt };
}

export { DASHBOARD_SESSION_COOKIE, SESSION_DURATION_SECONDS };
