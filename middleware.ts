import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_DENIED_PATH, DASHBOARD_SESSION_COOKIE, LOGIN_PATH, LOGOUT_PATH, isDashboardPasswordAuthConfigured } from "@/lib/authConfig";
import { verifyDashboardSession } from "@/lib/dashboardSession";

const publicPaths = new Set([LOGIN_PATH, ACCESS_DENIED_PATH, LOGOUT_PATH]);

function isPublicPath(pathname: string) {
  return (
    publicPaths.has(pathname) ||
    pathname === "/api/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico"
  );
}

function unauthorizedApi(message: string, status: 401 | 403) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0" } }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/");

  if (!isDashboardPasswordAuthConfigured()) {
    if (isApiRoute) {
      return unauthorizedApi("Dashboard owner password is not configured.", 403);
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("reason", "setup");
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifyDashboardSession(request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value);

  if (!session.valid) {
    if (isApiRoute) {
      return unauthorizedApi("Authentication required.", 401);
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
