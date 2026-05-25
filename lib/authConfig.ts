export const LOGIN_PATH = "/login";
export const ACCESS_DENIED_PATH = "/access-denied";
export const LOGOUT_PATH = "/logout";
export const DASHBOARD_SESSION_COOKIE = "property_dashboard_session";

function hasEnv(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function getDashboardOwnerPassword(): string | undefined {
  return process.env.DASHBOARD_OWNER_PASSWORD;
}

export function getDashboardSessionSecret(): string | undefined {
  return process.env.DASHBOARD_SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
}

export function isDashboardPasswordConfigured(): boolean {
  return hasEnv(getDashboardOwnerPassword());
}

export function isDashboardSessionSecretConfigured(): boolean {
  return hasEnv(getDashboardSessionSecret());
}

export function getAuthSetupStatus() {
  const dashboardOwnerPasswordConfigured = isDashboardPasswordConfigured();
  const dashboardSessionSecretConfigured = isDashboardSessionSecretConfigured();

  return {
    dashboardOwnerPasswordConfigured,
    dashboardSessionSecretConfigured,
    dashboardAccessConfigured: dashboardOwnerPasswordConfigured && dashboardSessionSecretConfigured,
    loginMethod: "Owner Password" as const
  };
}

export function isDashboardPasswordAuthConfigured(): boolean {
  const status = getAuthSetupStatus();
  return status.dashboardAccessConfigured;
}
