import { NextResponse, type NextRequest } from "next/server";
import { DASHBOARD_SESSION_COOKIE, LOGIN_PATH } from "@/lib/authConfig";
import { getExpiredSessionCookieOptions } from "@/lib/dashboardSession";

export function GET(request: NextRequest) {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.set(DASHBOARD_SESSION_COOKIE, "", getExpiredSessionCookieOptions());
  return response;
}
