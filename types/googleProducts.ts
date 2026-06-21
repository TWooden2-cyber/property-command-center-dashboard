export type GoogleProductStatusKind = "live" | "error" | "not_enabled" | "not_configured";

export type GoogleProductName = "Google Sheets" | "Google Drive" | "Google Calendar" | "Gmail" | "Google Tasks";

export type GoogleProductStatus = {
  product: GoogleProductName;
  configured: boolean;
  connected: boolean;
  mode: string;
  requiredEnvPresent: boolean;
  missingEnvVars: string[];
  status: GoogleProductStatusKind;
  checkedAt: string;
  message: string;
  details?: Record<string, unknown>;
};
