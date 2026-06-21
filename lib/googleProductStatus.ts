import { google } from "googleapis";
import { checkGoogleSheetsHealth } from "@/lib/googleSheets";
import { getGoogleOAuthConfig, getOAuthClient, readEnv, tokenScopeWarning } from "@/lib/googleReadOnlyAuth";
import type { GoogleProductStatus } from "@/types/googleProducts";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GMAIL_METADATA_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks.readonly";

const DRIVE_WRITE_SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.file"];
const CALENDAR_WRITE_SCOPES = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"];
const GMAIL_WRITE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://mail.google.com/"
];
const TASKS_WRITE_SCOPES = ["https://www.googleapis.com/auth/tasks"];

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

function missingStatus(product: GoogleProductStatus["product"], flagName: string, message: string): GoogleProductStatus {
  return {
    product,
    configured: false,
    connected: false,
    mode: "read-only",
    requiredEnvPresent: false,
    missingEnvVars: [flagName],
    status: "not_enabled",
    checkedAt: checkedAt(),
    message
  };
}

function readFlag(name: string): string {
  return readEnv(name).value.trim().toLowerCase();
}

function isExplicitlyDisabled(flagName: string): boolean {
  return readFlag(flagName) === "false";
}

function notConfigured(product: GoogleProductStatus["product"], missingEnvVars: string[], mode: string): GoogleProductStatus {
  return {
    product,
    configured: false,
    connected: false,
    mode,
    requiredEnvPresent: false,
    missingEnvVars,
    status: "not_configured",
    checkedAt: checkedAt(),
    message: `${product} read-only integration is built but missing required environment variables.`
  };
}

function errorStatus(product: GoogleProductStatus["product"], error: unknown, mode: string, details?: Record<string, unknown>): GoogleProductStatus {
  return {
    product,
    configured: true,
    connected: false,
    mode,
    requiredEnvPresent: true,
    missingEnvVars: [],
    status: "error",
    checkedAt: checkedAt(),
    message: error instanceof Error ? error.message : `${product} read-only status check failed.`,
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
  return {
    product: "Google Sheets",
    configured: sheets.requiredEnvPresent,
    connected: sheets.ok,
    mode: "live",
    requiredEnvPresent: sheets.requiredEnvPresent,
    missingEnvVars: sheets.missingEnvVars,
    status: sheets.ok ? "live" : "error",
    checkedAt: sheets.checkedAt,
    message: sheets.ok ? "Google Sheets live read-only connection verified" : sheets.error || "Google Sheets live read-only connection failed",
    details: {
      spreadsheetId: sheets.spreadsheetId,
      serviceAccountEmail: sheets.serviceAccountEmail
    }
  };
}

export async function getDriveProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_DRIVE_READONLY_ENABLED")) {
    return missingStatus("Google Drive", "GOOGLE_DRIVE_READONLY_ENABLED", "Drive read-only production integration is explicitly disabled.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_DRIVE_READONLY_TOKEN", ["GOOGLE_DRIVE_TOKEN", "GOOGLE_DRIVE_WRITE_TOKEN"]);
  const folderId = readEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID", ["GOOGLE_DRIVE_FOLDER_ID"]).value || DRIVE_ROOT_FOLDER_ID;
  if (config.missingEnvVars.length > 0) {
    return notConfigured("Google Drive", config.missingEnvVars, "read-only metadata");
  }

  const scopeWarning = tokenScopeWarning(config.tokenSource, DRIVE_SCOPE, DRIVE_WRITE_SCOPES);
  if (scopeWarning) return errorStatus("Google Drive", new Error(scopeWarning), "read-only metadata");

  try {
    const drive = google.drive({ version: "v3", auth: getOAuthClient(config) });
    const root = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType",
      supportsAllDrives: true
    });
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

    return {
      product: "Google Drive",
      configured: true,
      connected: true,
      mode: "read-only metadata",
      requiredEnvPresent: true,
      missingEnvVars: [],
      status: "live",
      checkedAt: checkedAt(),
      message: "Google Drive read-only metadata connection verified.",
      details: {
        rootFolderFound: Boolean(root.data.id),
        folderName: root.data.name || DRIVE_ROOT_FOLDER_NAME,
        folderId,
        visibleFolderCount: folders.length,
        keyFoldersFound: KEY_DRIVE_FOLDERS.filter((folder) => folderNames.has(folder)),
        missingKeyFolders: KEY_DRIVE_FOLDERS.filter((folder) => !folderNames.has(folder)),
        recentIntakeCount
      }
    };
  } catch (error) {
    return errorStatus("Google Drive", error, "read-only metadata", { folderId });
  }
}

export async function getCalendarProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_CALENDAR_READONLY_ENABLED")) {
    return missingStatus("Google Calendar", "GOOGLE_CALENDAR_READONLY_ENABLED", "Calendar read-only production integration is explicitly disabled.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_CALENDAR_READONLY_TOKEN", ["GOOGLE_CALENDAR_TOKEN", "GOOGLE_CALENDAR_WRITE_TOKEN"]);
  if (config.missingEnvVars.length > 0) {
    return notConfigured("Google Calendar", config.missingEnvVars, "read-only");
  }

  const scopeWarning = tokenScopeWarning(config.tokenSource, CALENDAR_SCOPE, CALENDAR_WRITE_SCOPES);
  if (scopeWarning) return errorStatus("Google Calendar", new Error(scopeWarning), "read-only");

  try {
    const calendar = google.calendar({ version: "v3", auth: getOAuthClient(config) });
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

    return {
      product: "Google Calendar",
      configured: true,
      connected: true,
      mode: "read-only",
      requiredEnvPresent: true,
      missingEnvVars: [],
      status: "live",
      checkedAt: checkedAt(),
      message: "Google Calendar read-only connection verified.",
      details: {
        calendarAccessible: true,
        upcomingPropertyEventCount: propertyEvents.length,
        nextEvents: propertyEvents.slice(0, 5).map((event) => ({
          title: event.summary || "(Untitled event)",
          start: event.start?.dateTime || event.start?.date || null,
          end: event.end?.dateTime || event.end?.date || null
        }))
      }
    };
  } catch (error) {
    return errorStatus("Google Calendar", error, "read-only");
  }
}

export async function getGmailProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_GMAIL_READONLY_ENABLED")) {
    return missingStatus("Gmail", "GOOGLE_GMAIL_READONLY_ENABLED", "Gmail metadata-only production integration is explicitly disabled.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_GMAIL_METADATA_TOKEN", ["GMAIL_METADATA_TOKEN", "GOOGLE_GMAIL_READONLY_TOKEN", "GMAIL_READONLY_TOKEN"]);
  if (config.missingEnvVars.length > 0) {
    return notConfigured("Gmail", config.missingEnvVars, "metadata-only");
  }

  const scopeWarning = tokenScopeWarning(config.tokenSource, GMAIL_METADATA_SCOPE, GMAIL_WRITE_SCOPES);
  if (scopeWarning) return errorStatus("Gmail", new Error(scopeWarning), "metadata-only");

  try {
    const gmail = google.gmail({ version: "v1", auth: getOAuthClient(config) });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const unread = await gmail.users.messages.list({ userId: "me", labelIds: ["UNREAD"], maxResults: 1 });
    const recent = await gmail.users.messages.list({ userId: "me", labelIds: ["INBOX"], maxResults: 5 });
    const recentMetadata = await Promise.all(
      (recent.data.messages || []).slice(0, 5).map(async (message) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: message.id || "",
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"]
        });
        const headers = detail.data.payload?.headers || [];
        const value = (name: string) => headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || "";
        return {
          from: value("From"),
          subject: value("Subject"),
          date: value("Date")
        };
      })
    );

    return {
      product: "Gmail",
      configured: true,
      connected: true,
      mode: "metadata-only",
      requiredEnvPresent: true,
      missingEnvVars: [],
      status: "live",
      checkedAt: checkedAt(),
      message: "Gmail metadata-only connection verified. Message bodies, attachments, drafts, and sends are not accessed.",
      details: {
        emailAddress: profile.data.emailAddress || null,
        unreadCount: unread.data.resultSizeEstimate ?? null,
        propertyRelatedMessageCount: null,
        propertyRelatedMessageCountNote: "Not queried because Gmail metadata scope does not support broad body/search review.",
        recentMessages: recentMetadata
      }
    };
  } catch (error) {
    return errorStatus("Gmail", error, "metadata-only");
  }
}

export async function getTasksProductStatus(): Promise<GoogleProductStatus> {
  if (isExplicitlyDisabled("GOOGLE_TASKS_READONLY_ENABLED")) {
    return missingStatus("Google Tasks", "GOOGLE_TASKS_READONLY_ENABLED", "Google Tasks read-only production integration is explicitly disabled.");
  }

  const config = getGoogleOAuthConfig("GOOGLE_TASKS_READONLY_TOKEN", ["GOOGLE_TASKS_TOKEN", "GOOGLE_TASKS_WRITE_TOKEN"]);
  if (config.missingEnvVars.length > 0) {
    return notConfigured("Google Tasks", config.missingEnvVars, "read-only");
  }

  const scopeWarning = tokenScopeWarning(config.tokenSource, TASKS_SCOPE, TASKS_WRITE_SCOPES);
  if (scopeWarning) return errorStatus("Google Tasks", new Error(scopeWarning), "read-only");

  try {
    const tasks = google.tasks({ version: "v1", auth: getOAuthClient(config) });
    const lists = await tasks.tasklists.list({ maxResults: 20 });
    const taskLists = lists.data.items || [];
    let openTaskCount = 0;
    let propertyRelatedTaskCount = 0;
    const nextDueTasks: Array<{ title: string; due: string | null; status: string | null }> = [];

    for (const list of taskLists.slice(0, 5)) {
      if (!list.id) continue;
      const response = await tasks.tasks.list({
        tasklist: list.id,
        showCompleted: false,
        showHidden: false,
        maxResults: 100
      });
      const items = response.data.items || [];
      openTaskCount += items.length;
      for (const task of items) {
        const searchable = `${task.title || ""} ${task.notes || ""}`;
        if (hasPropertyTerm(searchable)) propertyRelatedTaskCount += 1;
        if (task.due && nextDueTasks.length < 5) {
          nextDueTasks.push({
            title: task.title || "(Untitled task)",
            due: task.due,
            status: task.status || null
          });
        }
      }
    }

    return {
      product: "Google Tasks",
      configured: true,
      connected: true,
      mode: "read-only",
      requiredEnvPresent: true,
      missingEnvVars: [],
      status: "live",
      checkedAt: checkedAt(),
      message: "Google Tasks read-only connection verified.",
      details: {
        taskListsAccessible: true,
        taskListCount: taskLists.length,
        openTaskCount,
        propertyRelatedTaskCount,
        nextDueTasks
      }
    };
  } catch (error) {
    return errorStatus("Google Tasks", error, "read-only");
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
