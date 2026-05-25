export const LOGIN_PATH = "/login";
export const ACCESS_DENIED_PATH = "/access-denied";

export function getAllowedOwnerEmails(): string[] {
  return (process.env.ALLOWED_OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAuthSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
}

export function getAuthUrl(): string | undefined {
  return process.env.NEXTAUTH_URL || process.env.AUTH_URL;
}

export function isOwnerAllowlistConfigured(): boolean {
  return getAllowedOwnerEmails().length > 0;
}

export function isApprovedOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowedEmails = getAllowedOwnerEmails();
  if (!allowedEmails.length) return false;
  return allowedEmails.includes(email.trim().toLowerCase());
}

export function getAuthSetupStatus() {
  const allowedOwnerEmailCount = getAllowedOwnerEmails().length;

  return {
    authSecretConfigured: Boolean(getAuthSecret()),
    authUrlConfigured: Boolean(getAuthUrl()),
    googleClientIdConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientSecretConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    allowedOwnerEmailsConfigured: allowedOwnerEmailCount > 0,
    allowedOwnerEmailCount
  };
}

export function isGoogleAuthConfigured(): boolean {
  const status = getAuthSetupStatus();
  return Boolean(
    status.authSecretConfigured &&
      status.authUrlConfigured &&
      status.googleClientIdConfigured &&
      status.googleClientSecretConfigured &&
      status.allowedOwnerEmailsConfigured
  );
}
