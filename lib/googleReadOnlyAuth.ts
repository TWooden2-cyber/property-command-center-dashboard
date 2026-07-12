import { google } from "googleapis";
import type { GoogleProductErrorCode } from "@/types/googleProducts";

function cleanEnv(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function readEnv(primary: string, aliases: string[] = []) {
  const names = [primary, ...aliases];
  for (const name of names) {
    const value = cleanEnv(process.env[name]);
    if (value) return { name, value };
  }

  return { name: primary, value: "" };
}

export function isEnabledFlag(name: string): boolean {
  return cleanEnv(process.env[name]).toLowerCase() === "true";
}

export type OAuthTokenSource = {
  token: string;
  envName: string;
};

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenSource: OAuthTokenSource | null;
  missingEnvVars: string[];
};

export type ParsedGoogleToken = {
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
  scopes: string[];
  raw: Record<string, unknown> | null;
};

export function getGoogleOAuthConfig(tokenEnv: string, tokenAliases: string[] = []): GoogleOAuthConfig {
  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = readEnv("GOOGLE_REDIRECT_URI", ["NEXTAUTH_URL"]);
  const token = readEnv(tokenEnv, tokenAliases);
  const missingEnvVars: string[] = [];

  if (!clientId.value) missingEnvVars.push("GOOGLE_CLIENT_ID");
  if (!clientSecret.value) missingEnvVars.push("GOOGLE_CLIENT_SECRET");
  if (!token.value) missingEnvVars.push(tokenEnv);

  return {
    clientId: clientId.value,
    clientSecret: clientSecret.value,
    redirectUri: redirectUri.value || "urn:ietf:wg:oauth:2.0:oob",
    tokenSource: token.value ? { token: token.value, envName: token.name } : null,
    missingEnvVars
  };
}

export function getOAuthClient(config: GoogleOAuthConfig) {
  const auth = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  const token = config.tokenSource?.token ?? "";

  try {
    const parsed = JSON.parse(token) as Record<string, string | number>;
    auth.setCredentials(parsed);
  } catch {
    auth.setCredentials({ refresh_token: token });
  }

  return auth;
}

export function parseGoogleToken(tokenSource: OAuthTokenSource | null): ParsedGoogleToken {
  if (!tokenSource) return { scopes: [], raw: null };

  try {
    const parsed = JSON.parse(tokenSource.token) as Record<string, unknown>;
    return {
      accessToken: typeof parsed.access_token === "string" ? parsed.access_token : undefined,
      refreshToken: typeof parsed.refresh_token === "string" ? parsed.refresh_token : undefined,
      expiryDate: typeof parsed.expiry_date === "number" ? parsed.expiry_date : undefined,
      scopes: String(parsed.scope || "").split(/\s+/).filter(Boolean),
      raw: parsed
    };
  } catch {
    return {
      refreshToken: tokenSource.token,
      scopes: [],
      raw: null
    };
  }
}

export function tokenExpirationStatus(tokenSource: OAuthTokenSource | null): string {
  const parsed = parseGoogleToken(tokenSource);
  if (!tokenSource) return "token missing";
  if (!parsed.expiryDate) return parsed.refreshToken ? "refresh token present; access token refreshable" : "no expiry date recorded";

  const expiresAt = new Date(parsed.expiryDate);
  if (Number.isNaN(expiresAt.getTime())) return "token expiry unreadable";

  if (parsed.expiryDate <= Date.now()) {
    return parsed.refreshToken
      ? `access token expired ${expiresAt.toISOString()}; refresh token present`
      : `token expired ${expiresAt.toISOString()}; refresh token missing`;
  }

  return `access token expires ${expiresAt.toISOString()}${parsed.refreshToken ? "; refresh token present" : "; refresh token missing"}`;
}

export function missingRequiredScopes(tokenSource: OAuthTokenSource | null, requiredScopes: string[] | string[][]) {
  const parsed = parseGoogleToken(tokenSource);
  if (!parsed.scopes.length) return [];
  return requiredScopes
    .map((scope) => (Array.isArray(scope) ? scope : [scope]))
    .filter((scopeGroup) => !scopeGroup.some((scope) => parsed.scopes.includes(scope)))
    .map((scopeGroup) => scopeGroup[0]);
}

export function tokenConnectivityIssue(tokenSource: OAuthTokenSource | null, requiredScopes: string[] | string[][]): {
  errorCode: GoogleProductErrorCode | null;
  message: string | null;
  missingScopes: string[];
} {
  if (!tokenSource) return { errorCode: null, message: null, missingScopes: [] };

  const parsed = parseGoogleToken(tokenSource);
  const missingScopes = missingRequiredScopes(tokenSource, requiredScopes);
  if (missingScopes.length) {
    return {
      errorCode: "scope missing",
      message: `scope missing: ${missingScopes.join(", ")}`,
      missingScopes
    };
  }

  if (parsed.expiryDate && parsed.expiryDate <= Date.now() && !parsed.refreshToken) {
    return {
      errorCode: "refresh token missing",
      message: "token expired; refresh token missing",
      missingScopes: []
    };
  }

  return { errorCode: null, message: null, missingScopes: [] };
}

export async function refreshAccessTokenIfPossible(config: GoogleOAuthConfig) {
  const auth = getOAuthClient(config);
  const token = parseGoogleToken(config.tokenSource);
  if (token.refreshToken) await auth.getAccessToken();
  return auth;
}

export function classifyGoogleApiError(error: unknown): { errorCode: GoogleProductErrorCode; message: string } {
  const candidate = error as {
    code?: number;
    status?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
    response?: { status?: number; data?: { error?: string; error_description?: string; message?: string } };
  };
  const status = candidate.code || candidate.status || candidate.response?.status;
  const reason = `${candidate.message || ""} ${candidate.response?.data?.error || ""} ${candidate.response?.data?.error_description || ""} ${(candidate.errors || []).map((entry) => `${entry.reason || ""} ${entry.message || ""}`).join(" ")}`.toLowerCase();

  if (reason.includes("access_not_configured") || reason.includes("api has not been used") || reason.includes("disabled")) {
    return { errorCode: "API disabled", message: `API disabled: ${candidate.message || candidate.response?.data?.message || "Google API is disabled for this project."}` };
  }
  if (status === 401 && (reason.includes("invalid_grant") || reason.includes("expired") || reason.includes("token"))) {
    return { errorCode: "token expired", message: `token expired: ${candidate.message || "Google token was rejected."}` };
  }
  if (status === 403 || reason.includes("forbidden") || reason.includes("permission")) {
    return { errorCode: "permission denied", message: `permission denied: ${candidate.message || "Google denied access to this resource."}` };
  }

  return { errorCode: "unknown error", message: candidate.message || "Google status check failed." };
}

export function tokenScopeWarning(tokenSource: OAuthTokenSource | null, requiredScope: string, forbiddenScopes: string[] = []): string | null {
  if (!tokenSource) return null;

  try {
    const parsed = JSON.parse(tokenSource.token) as { scope?: string };
    const scopes = String(parsed.scope || "").split(/\s+/).filter(Boolean);
    const acceptableScopes = new Set([requiredScope, ...forbiddenScopes]);
    if (scopes.length > 0 && !scopes.some((scope) => acceptableScopes.has(scope))) {
      return `${tokenSource.envName} token does not list required scope ${requiredScope}.`;
    }
  } catch {
    return null;
  }

  return null;
}
