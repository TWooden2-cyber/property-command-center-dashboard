import { google } from "googleapis";
import { NextResponse } from "next/server";
import { requireApiOwner } from "@/lib/apiAuth";
import { GOOGLE_READONLY_SCOPES } from "@/lib/googleProductStatus";
import { readEnv } from "@/lib/googleReadOnlyAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = await requireApiOwner();
  if (auth.response) return auth.response;

  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const configuredRedirect = readEnv("GOOGLE_REDIRECT_URI");
  const origin = new URL(request.url).origin;
  const redirectUri = configuredRedirect.value || `${origin}/api/google/reconnect/callback`;

  if (!clientId.value || !clientSecret.value) {
    return NextResponse.json(
      {
        ok: false,
        error: "env var missing",
        missingEnvVars: [!clientId.value ? "GOOGLE_CLIENT_ID" : "", !clientSecret.value ? "GOOGLE_CLIENT_SECRET" : ""].filter(Boolean)
      },
      { status: 503 }
    );
  }

  const oauth = new google.auth.OAuth2(clientId.value, clientSecret.value, redirectUri);
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GOOGLE_READONLY_SCOPES
  });

  return NextResponse.redirect(url);
}
