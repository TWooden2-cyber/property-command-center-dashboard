import { google } from "googleapis";
import { checkGoogleSheetsHealth } from "@/lib/googleSheets";
import {
  classifyGoogleApiError,
  getGoogleOAuthConfig,
  parseGoogleToken,
  readEnv,
  refreshAccessTokenIfPossible,
  tokenConnectivityIssue,
  tokenExpirationStatus,
  type GoogleOAuthConfig
} from "@/lib/googleReadOnlyAuth";
import type { GoogleProductErrorCode, GoogleProductName, GoogleProductStatus } from "@/types/googleProducts";

export const GOOGLE_READONLY_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks.readonly"
];

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks.readonly";

const DRIVE_ROOT_FOLDER_ID = "1200_qPBmBz6KHjZY59HTPMpvXTCt5bGt";
const DRIVE_ROOT_FOLDER_NAME = "PROPERTY MANAGEMENT OPERATING SYSTEM";
const KEY_DRIVE_FOLDERS = [
  "Property Management Intake",
  "MASTER SOP",
  "MASTER TRACKER",
  "PROPERTY DOCUMENTS",
  "EVICTIONS AND NOTICES",
  "LEGAL AND COMPLIANCE",
  "RENT COLLECTION",
  "MAINTENANCE",
  "UTILITIES",
  "PROPERTY PHOTOS AND INSPECTIONS",
  "VENDOR INFO",
  "MONTHLY REPORTS",
  "TENANT MESSAGE LIBRARY",
  "12 Owner Approvals"
];

const PROPERTY_TERMS = [
  "Property Command",
  "rent",
  "mortgage",
  "maintenance",
  "utility",
  "inspection",
  "follow-up",
  "eviction",
  "notice",
  "owner approval",
  "228 Reifert",
  "RentRedi",
  "HACP",
  "Section 8",
  "Duquesne",
  "Columbia Gas",
  "PA American Water",
  "Republic",
  "West Comm"
];

function checkedAt() {
  return new Date().toISOString();
}

function readFlag(name: string): string {
  return readEnv(name).value.trim().toLowerCase();
}

function isExplicitlyDisabled(flagName: string): boolean {
  return readFlag(flagName) === "false";
}

function isVercelProduction() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV === "production");
}

function envMissingCode(): GoogleProductErrorCode {
  return isVercelProduction() ? "Vercel production env mismatch" : "env var missing";
}

function missingStatus(product: GoogleProductName, flagName: string, message: string): GoogleProductStatus {
  return {
    product,
    configured: false,
    connected: false,
    mode: "read-only",
    requiredEnvPresent: false,
    missingEnvVars: [flagName],
    missingScopes: [],
    status: "not_enabled",
    checkedAt: checkedAt(),
    message,
    tokenExpirationStatus: "token missing",
    lastSuccessfulSync: null,
    lastErrorMessage: message,
    errorCode: "env var missing"
  };
}

function notConfigured(product: GoogleProductName, missingEnvVars: string[], mode: string): GoogleProductStatus {
  const prefix = isVercelProduction() ? "Vercel production env mismatch" : "env var missing";
  const message = `${prefix}: ${missingEnvVars.join(", ")}`;
  return {
    product,
    configured: false,
    connected: false,
    mode,
    requiredEnvPresent: false,
    missingEnvVars,
    missingScopes: [],
    status: "not_configured",
    checkedAt: checkedAt(),
    message,
    tokenExpirationStatus: "token missing",
    lastSuccessfulSync: null,
    lastErrorMessage: message,
    errorCode: envMissingCode()
  };
}

function oauthBase(product: GoogleProductName, mode: string, config: GoogleOAuthConfig): Pick<
  GoogleProductStatus,
  "product" | "configured" | "mode" | "requiredEnvPresent" | "missingEnvVars" | "tokenExpirationStatus"
> {
  return {
    product,
    configured: true,
    mode,
    requiredEnvPresent: true,
    missingEnvVars: config.missingEnvVars,
    tokenExpirationStatus: tokenExpirationStatus(config.tokenSource)
  };
}

function oauthPreflight(product: GoogleProductName, mode: string, config: GoogleOAuthConfig, scopes: string[]) {
  if (config.missingEnvVars.length > 0) return notConfigured(product, config.missingEnvVars, mode);

  const issue = tokenConnectivityIssue(config.tokenSource, scopes);
  if (issue.errorCode && issue.message) {
    return {
      ...oauthBase(product, mode, config),
      connected: false,
      missingScopes: issue.missingScopes,
      status: "error" as const,
      checkedAt: checkedAt(),
      message: issue.message,
      lastSuccessfulSync: null,
      lastErrorMessage: issue.message,
      errorCode: issue.errorCode
    };
  }

  return null;
}

function apiErrorStatus(product: GoogleProductName, error: unknown, mode: string, config?: GoogleOAuthConfig, details?: Record<string, unknown>): GoogleProductStatus {
  const classified = classifyGoogleApiError(error);
  return {
    product,
    configured: true,
    connected: false,
    mode,
    requiredEnvPresent: true,
    missingEnvVars: config?.missingEnvVars || [],
    missingScopes: [],
    status: "error",
    checkedAt: checkedAt(),
    message: classified.message,
    tokenExpirationStatus: config ? tokenExpirationStatus(config.tokenSource) : undefined,
    lastSuccessfulSync: null,
    lastErrorMessage: classified.message,
    errorCode: classified.errorCode,
    details
  };
}

function liveStatus(
  product: GoogleProductName,
  mode: string,
  config: GoogleOAuthConfig | null,
  message: string,
  details: Record<string, unknown>,
  connectedAccountEmail?: string | null
): GoogleProductStatus {
  const now = checkedAt();
  return {
    product,
    configured: true,
    connected: true,
    mode,
    requiredEnvPresent: true,
    missingEnvVars: [],
    missingScopes: [],
    status: "live",
    checkedAt: now,
    message,
    connectedAccountEmail: connectedAccountEmail || null,
    tokenExpirationStatus: config ? tokenExpirationStatus(config.tokenSource) : "service account token active",
    lastSuccessfulSync: now,
    lastErrorMessage: null,
    errorCode: null,
    details
  };
}

function normalize(value: string) {
  return value.toLowerCase();
}

function hasPropertyTerm(value: string) {
  const text = normalize(value);
  return PROPERTY_TERMS.some((term) => text.includes(normalize(term)));
}

export async function getSheetsProductStatus(): Promise<GoogleProductStatus> {
  const sheets = await checkGoogleSheetsHealth();
  const message = sheets.ok
    ? "Google Sheets live read-only connection verified."
    : sheets.error || "Google Sheets live read-only connection failed.";

  return {
    product: "Google Sheets",
    configured: sheets.requiredEnvPresent,
    connected: sheets.ok,
    mode: "live read-only",
    requiredEnvPresent: sheets.requiredEnvPresent,
    missingEnvVars: sheets.missingEnvVars,
    missingScopes: [],
    status: sheets.ok ? "live" : sheets.requiredEnvPresent ? "error" : "not_configured",
    checkedAt: sheets.checkedAt,
    message: sheets.ok ? message : `${sheets.missingEnvVars.length ? "env var missing" : "permission denied"}: ${message}`,
    connectedAccountEmail: sheets.serviceAccountEmail || null,
    tokenExpirationStatus: "service account token active",
    lastSuccessfulSync: sheets.ok ? sheets.checkedAt : null,
    lastErrorMessage: sheets.ok ? null : message,
    errorCode: sheets.ok ? null : sheets.missingEnvVars.length ? envMissingCode() : "permission denied",
    details: {
      spreadsheetId: sheets.spreadsheetId,
      serviceAccountEmail: sheets.serviceAccountEmail
    }
  };
}

export async function getDriveProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_DRIVE_READONLY_ENABLED")) {
    return missingStatus("Google Drive", "GOOGLE_DRIVE_READONLY_ENABLED", "env var missing: GOOGLE_DRIVE_READONLY_ENABLED is false.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_DRIVE_READONLY_TOKEN", ["GOOGLE_DRIVE_TOKEN", "GOOGLE_DRIVE_WRITE_TOKEN"]);
  const preflight = oauthPreflight("Google Drive", "read-only metadata", config, [DRIVE_SCOPE]);
  if (preflight) return preflight;

  const folderId = readEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID", ["GOOGLE_DRIVE_FOLDER_ID"]).value || DRIVE_ROOT_FOLDER_ID;

  try {
    const auth = await refreshAccessTokenIfPossible(config);
    const drive = google.drive({ version: "v3", auth });
    const about = await drive.about.get({ fields: "user(emailAddress)" });
    const root = await drive.files.get({ fileId: folderId, fields: "id,name,mimeType", supportsAllDrives: true });
    const children = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id,name,mimeType,modifiedTime)",
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    const folders = (children.data.files || []).filter((file) => file.mimeType === "application/vnd.google-apps.folder");
    const folderNames = new Set(folders.map((file) => file.name || ""));
    const intake = folders.find((file) => file.name === "Property Management Intake");
    let recentIntakeCount: number | null = null;

    if (intake?.id) {
      const intakeChildren = await drive.files.list({
        q: `'${intake.id}' in parents and trashed = false`,
        fields: "files(id)",
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });
      recentIntakeCount = intakeChildren.data.files?.length ?? 0;
    }

    return liveStatus(
      "Google Drive",
      "read-only metadata",
      config,
      "Google Drive read-only metadata connection verified.",
      {
        rootFolderFound: Boolean(root.data.id),
        folderName: root.data.name || DRIVE_ROOT_FOLDER_NAME,
        folderId,
        visibleFolderCount: folders.length,
        keyFoldersFound: KEY_DRIVE_FOLDERS.filter((folder) => folderNames.has(folder)),
        missingKeyFolders: KEY_DRIVE_FOLDERS.filter((folder) => !folderNames.has(folder)),
        recentIntakeCount
      },
      about.data.user?.emailAddress || null
    );
  } catch (error) {
    return apiErrorStatus("Google Drive", error, "read-only metadata", config, { folderId });
  }
}

export async function getCalendarProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_CALENDAR_READONLY_ENABLED")) {
    return missingStatus("Google Calendar", "GOOGLE_CALENDAR_READONLY_ENABLED", "env var missing: GOOGLE_CALENDAR_READONLY_ENABLED is false.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_CALENDAR_READONLY_TOKEN", ["GOOGLE_CALENDAR_TOKEN", "GOOGLE_CALENDAR_WRITE_TOKEN"]);
  const preflight = oauthPreflight("Google Calendar", "read-only", config, [CALENDAR_SCOPE]);
  if (preflight) return preflight;

  try {
    const auth = await refreshAccessTokenIfPossible(config);
    const calendar = google.calendar({ version: "v3", auth });
    const primary = await calendar.calendars.get({ calendarId: "primary" });
    const now = new Date();
    const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: later.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
      fields: "items(id,summary,start,end)"
    });
    const events = response.data.items || [];
    const propertyEvents = events.filter((event) => hasPropertyTerm(event.summary || ""));

    return liveStatus(
      "Google Calendar",
      "read-only",
      config,
      "Google Calendar read-only connection verified.",
      {
        calendarAccessible: true,
        upcomingPropertyEventCount: propertyEvents.length,
        nextEvents: propertyEvents.slice(0, 5).map((event) => ({
          title: event.summary || "(Untitled event)",
          start: event.start?.dateTime || event.start?.date || null,
          end: event.end?.dateTime || event.end?.date || null
        }))
      },
      primary.data.id || null
    );
  } catch (error) {
    return apiErrorStatus("Google Calendar", error, "read-only", config);
  }
}

export async function getGmailProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_GMAIL_READONLY_ENABLED")) {
    return missingStatus("Gmail", "GOOGLE_GMAIL_READONLY_ENABLED", "env var missing: GOOGLE_GMAIL_READONLY_ENABLED is false.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_GMAIL_READONLY_TOKEN", ["GMAIL_READONLY_TOKEN", "GOOGLE_GMAIL_METADATA_TOKEN", "GMAIL_METADATA_TOKEN"]);
  const preflight = oauthPreflight("Gmail", "read-only full intake", config, [GMAIL_SCOPE]);
  if (preflight) return preflight;

  try {
    const auth = await refreshAccessTokenIfPossible(config);
    const gmail = google.gmail({ version: "v1", auth });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const unread = await gmail.users.messages.list({ userId: "me", labelIds: ["UNREAD"], maxResults: 1 });
    const recent = await gmail.users.messages.list({ userId: "me", labelIds: ["INBOX"], maxResults: 5 });

    return liveStatus(
      "Gmail",
      "read-only full intake",
      config,
      "Gmail read-only connection verified for full email intake. Sending and modifying Gmail remain blocked.",
      {
        emailAddress: profile.data.emailAddress || null,
        unreadCount: unread.data.resultSizeEstimate ?? null,
        recentInboxMessageCount: recent.data.messages?.length ?? 0,
        tokenScopes: parseGoogleToken(config.tokenSource).scopes
      },
      profile.data.emailAddress || null
    );
  } catch (error) {
    return apiErrorStatus("Gmail", error, "read-only full intake", config);
  }
}

export async function getTasksProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_TASKS_READONLY_ENABLED")) {
    return missingStatus("Google Tasks", "GOOGLE_TASKS_READONLY_ENABLED", "env var missing: GOOGLE_TASKS_READONLY_ENABLED is false.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_TASKS_READONLY_TOKEN", ["GOOGLE_TASKS_TOKEN", "GOOGLE_TASKS_WRITE_TOKEN"]);
  const preflight = oauthPreflight("Google Tasks", "read-only", config, [TASKS_SCOPE]);
  if (preflight) return preflight;

  try {
    const auth = await refreshAccessTokenIfPossible(config);
    const tasks = google.tasks({ version: "v1", auth });
    const lists = await tasks.tasklists.list({ maxResults: 20 });
    const taskLists = lists.data.items || [];
    let openTaskCount = 0;
    let propertyRelatedTaskCount = 0;
    const nextDueTasks: Array<{ title: string; due: string | null; status: string | null }> = [];

    for (const list of taskLists.slice(0, 5)) {
      if (!list.id) continue;
      const response = await tasks.tasks.list({ tasklist: list.id, showCompleted: false, showHidden: false, maxResults: 100 });
      const items = response.data.items || [];
      openTaskCount += items.length;
      for (const task of items) {
        const searchable = `${task.title || ""} ${task.notes || ""}`;
        if (hasPropertyTerm(searchable)) propertyRelatedTaskCount += 1;
        if (task.due && nextDueTasks.length < 5) {
          nextDueTasks.push({ title: task.title || "(Untitled task)", due: task.due, status: task.status || null });
        }
      }
    }

    return liveStatus(
      "Google Tasks",
      "read-only",
      config,
      "Google Tasks read-only connection verified.",
      {
        taskListsAccessible: true,
        taskListCount: taskLists.length,
        openTaskCount,
        propertyRelatedTaskCount,
        nextDueTasks
      },
      null
    );
  } catch (error) {
    return apiErrorStatus("Google Tasks", error, "read-only", config);
  }
}

export async function getGoogleProductsStatus(): Promise<GoogleProductStatus[]> {
  return Promise.all([
    getSheetsProductStatus(),
    getDriveProductStatus(),
    getCalendarProductStatus(),
    getGmailProductStatus(),
    getTasksProductStatus()
  ]);
}
