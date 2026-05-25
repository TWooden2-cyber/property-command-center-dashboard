import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { ACCESS_DENIED_PATH, LOGIN_PATH, getAllowedOwnerEmails, getAuthSecret, isGoogleAuthConfigured } from "@/lib/authConfig";

const publicPaths = new Set([LOGIN_PATH, ACCESS_DENIED_PATH]);

function isPublicPath(pathname: string) {
  return (
    publicPaths.has(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico"
  );
}

function unauthorizedApi(message: string, status: 401 | 403) {
  return NextResponse.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/");
  const secret = getAuthSecret();
  const allowedEmails = getAllowedOwnerEmails();

  if (!secret || allowedEmails.length === 0 || !isGoogleAuthConfigured()) {
    if (isApiRoute) {
      return unauthorizedApi("Dashboard access control is not configured.", 403);
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("reason", "setup");
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const token = await getToken({ req: request, secret });
  const email = token?.email?.toLowerCase();

  if (!email) {
    if (isApiRoute) {
      return unauthorizedApi("Authentication required.", 401);
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (!allowedEmails.includes(email)) {
    if (isApiRoute) {
      return unauthorizedApi("This Google account is not authorized.", 403);
    }

    const deniedUrl = request.nextUrl.clone();
    deniedUrl.pathname = ACCESS_DENIED_PATH;
    return NextResponse.redirect(deniedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
