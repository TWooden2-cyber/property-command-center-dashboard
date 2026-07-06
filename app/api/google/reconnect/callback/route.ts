import { google } from "googleapis";
import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/apiAuth";
import { readEnv } from "@/lib/googleReadOnlyAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function html(body: string, status = 200) {
  return new NextResponse(`<!doctype html><html><head><title>Google Reconnect</title><style>body{font-family:Arial,sans-serif;background:#0b1626;color:#f8fafc;padding:32px}main{max-width:960px;margin:0 auto;background:#111f33;border:1px solid #2c3f5f;border-radius:16px;padding:24px}pre{white-space:pre-wrap;background:#07111f;border:1px solid #32455f;border-radius:12px;padding:16px;color:#dbeafe}a{color:#f4c95d}</style></head><body><main>${body}</main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export async function GET(request: Request) {
  const owner = await requireApiOwner();
  if (owner.response) return owner.response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return html("<h1>Google reconnect blocked</h1><p>Missing OAuth code from Google.</p>", 400);

  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const configuredRedirect = readEnv("GOOGLE_REDIRECT_URI");
  const origin = url.origin;
  const redirectUri = configuredRedirect.value || `${origin}/api/google/reconnect/callback`;

  if (!clientId.value || !clientSecret.value) {
    return html("<h1>Google reconnect blocked</h1><p>env var missing: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.</p>", 503);
  }

  try {
    const oauth = new google.auth.OAuth2(clientId.value, clientSecret.value, redirectUri);
    const token = await oauth.getToken(code);
    const tokenJson = JSON.stringify(token.tokens);
    const envBlock = [
      "GOOGLE_DRIVE_READONLY_ENABLED=true",
      `GOOGLE_DRIVE_READONLY_TOKEN=${tokenJson}`,
      "GOOGLE_CALENDAR_READONLY_ENABLED=true",
      `GOOGLE_CALENDAR_READONLY_TOKEN=${tokenJson}`,
      "GOOGLE_GMAIL_READONLY_ENABLED=true",
      `GOOGLE_GMAIL_READONLY_TOKEN=${tokenJson}`,
      "GOOGLE_TASKS_READONLY_ENABLED=true",
      `GOOGLE_TASKS_READONLY_TOKEN=${tokenJson}`
    ].join("\n");

    return html(`
      <h1>Google reconnect complete</h1>
      <p>Read-only Gmail, Drive, Calendar, and Tasks authorization succeeded. Install these values in local <code>.env.local</code> and Vercel Production, then redeploy.</p>
      <p>Safety remains read-only. This token does not grant Gmail send, Drive write, Calendar write, or Tasks write scopes.</p>
      <pre>${envBlock.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>
      <p><a href="/google-connection-center">Return to Google Connection Center</a></p>
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth token exchange failed.";
    return html(`<h1>Google reconnect failed</h1><p>permission denied: ${message}</p>`, 400);
  }
}
