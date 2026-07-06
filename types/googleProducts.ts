export type GoogleProductStatusKind = "live" | "error" | "not_enabled" | "not_configured";

export type GoogleProductName = "Google Sheets" | "Google Drive" | "Google Calendar" | "Gmail" | "Google Tasks";

export type GoogleProductErrorCode =
  | "token expired"
  | "refresh token missing"
  | "scope missing"
  | "env var missing"
  | "API disabled"
  | "permission denied"
  | "Vercel production env mismatch"
  | "unknown error";

export type GoogleProductStatus = {
  product: GoogleProductName;
  configured: boolean;
  connected: boolean;
  mode: string;
  requiredEnvPresent: boolean;
  missingEnvVars: string[];
  missingScopes: string[];
  status: GoogleProductStatusKind;
  checkedAt: string;
  message: string;
  connectedAccountEmail?: string | null;
  tokenExpirationStatus?: string;
  lastSuccessfulSync?: string | null;
  lastErrorMessage?: string | null;
  errorCode?: GoogleProductErrorCode | null;
  details?: Record<string, unknown>;
};
