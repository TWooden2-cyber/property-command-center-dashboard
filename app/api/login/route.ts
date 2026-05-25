import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, getDashboardOwnerPassword, isDashboardPasswordAuthConfigured } from "@/lib/authConfig";
import { createDashboardSessionCookieValue, DASHBOARD_SESSION_COOKIE, getSessionCookieOptions } from "@/lib/dashboardSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeCallbackUrl(callbackUrl: unknown): string {
  if (typeof callbackUrl !== "string" || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/";
  }

  if (callbackUrl.startsWith(LOGIN_PATH)) {
    return "/";
  }

  return callbackUrl;
}

export async function POST(request: NextRequest) {
  if (!isDashboardPasswordAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Dashboard owner password is not configured." },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  let body: { password?: unknown; callbackUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const expectedPassword = getDashboardOwnerPassword();
  const suppliedPassword = typeof body.password === "string" ? body.password : "";

  if (!expectedPassword || suppliedPassword !== expectedPassword) {
    return NextResponse.json(
      { ok: false, error: "Invalid owner password." },
      { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const session = await createDashboardSessionCookieValue();
  const redirectTo = safeCallbackUrl(body.callbackUrl);
  const response = NextResponse.json({ ok: true, redirectTo }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  response.cookies.set(DASHBOARD_SESSION_COOKIE, session.value, getSessionCookieOptions());

  return response;
}
