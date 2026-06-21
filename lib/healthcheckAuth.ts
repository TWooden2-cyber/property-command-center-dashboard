import type { NextRequest } from "next/server";

type HealthcheckAuthResult =
  | { ok: true }
  | {
      ok: false;
      status: 401 | 503;
      errorType: "missing_env" | "unauthorized";
      error: string;
    };

function configuredTokens(): string[] {
  return [process.env.GOOGLE_HEALTHCHECK_TOKEN, process.env.GOOGLE_QA_ACCESS_TOKEN].map((token) => token?.trim()).filter((token): token is string => Boolean(token));
}

export function authorizeHealthcheck(request: NextRequest, label = "Health check"): HealthcheckAuthResult {
  const tokens = configuredTokens();
  if (tokens.length === 0) {
    return {
      ok: false,
      status: 503,
      errorType: "missing_env",
      error: "Missing required environment variable: GOOGLE_HEALTHCHECK_TOKEN"
    };
  }

  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  const headerToken = request.headers.get("x-healthcheck-token")?.trim();
  const authorized = tokens.some((token) => queryToken === token || headerToken === token);

  if (authorized) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 401,
    errorType: "unauthorized",
    error: `${label} token is required.`
  };
}
