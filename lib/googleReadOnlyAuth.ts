import { google } from "googleapis";

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
    const parsed = JSON.parse(token) as Record<string, string>;
    auth.setCredentials(parsed);
  } catch {
    auth.setCredentials({ refresh_token: token });
  }

  return auth;
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
