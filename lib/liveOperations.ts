import { isLiveSheetsConfigured } from "@/lib/googleSheets";
import { LIVE_OPERATIONS_AUDIT_HEADERS, LIVE_OPERATIONS_AUDIT_TAB } from "@/lib/liveOperationsAudit";
import type { LiveOperationServiceKey, LiveOperationServiceStatus, LiveOperationsStatus } from "@/types/sheets";

type ServiceDefinition = {
  key: LiveOperationServiceKey;
  label: string;
  flag: string;
  missingWhenEnabled: () => string[];
  allowedActions: string[];
  forbiddenActions: string[];
};

function flagEnabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

const serviceDefinitions: ServiceDefinition[] = [
  {
    key: "sheets",
    label: "Google Sheets Write",
    flag: "GOOGLE_SHEETS_WRITE_ENABLED",
    missingWhenEnabled: () => (isLiveSheetsConfigured() ? [] : ["Google Sheets service account write configuration"]),
    allowedActions: ["Add rows", "Update status", "Update notes", "Update follow-up dates", "Update proof status", "Update owner approval status"],
    forbiddenActions: ["Delete tabs", "Delete rows", "Delete columns", "Clear ranges", "Overwrite full tabs", "Edit formulas without approval"]
  },
  {
    key: "gmail",
    label: "Gmail Read",
    flag: "GMAIL_READ_ENABLED",
    missingWhenEnabled: () => (hasEnv("GMAIL_READONLY_TOKEN") || hasEnv("GOOGLE_GMAIL_READONLY_TOKEN") ? [] : ["Gmail read-only OAuth token/scope"]),
    allowedActions: ["Search metadata", "Open selected emails after approval", "Link selected email info to queues"],
    forbiddenActions: ["Send", "Reply", "Forward", "Delete", "Archive", "Label without separate approval"]
  },
  {
    key: "calendar",
    label: "Google Calendar Create",
    flag: "GOOGLE_CALENDAR_WRITE_ENABLED",
    missingWhenEnabled: () => (hasEnv("GOOGLE_CALENDAR_TOKEN") || hasEnv("GOOGLE_CALENDAR_WRITE_TOKEN") ? [] : ["Google Calendar event-create authorization/scope"]),
    allowedActions: ["Create reminders", "Create maintenance follow-ups", "Create rent follow-ups", "Create inspection follow-ups", "Create weekly command reviews"],
    forbiddenActions: ["Delete events", "Modify existing events without approval", "Invite tenants or vendors automatically", "Create legal deadlines without approval"]
  },
  {
    key: "tasks",
    label: "Google Tasks Create/Update",
    flag: "GOOGLE_TASKS_WRITE_ENABLED",
    missingWhenEnabled: () => (hasEnv("GOOGLE_TASKS_TOKEN") || hasEnv("GOOGLE_TASKS_WRITE_TOKEN") ? [] : ["Google Tasks write authorization/scope"]),
    allowedActions: ["Create owner tasks", "Create maintenance follow-up tasks", "Create rent follow-up tasks", "Create proof-needed tasks", "Update task status after approval"],
    forbiddenActions: ["Delete tasks", "Mark complete automatically without owner approval"]
  },
  {
    key: "drive",
    label: "Google Drive Create/Move",
    flag: "GOOGLE_DRIVE_WRITE_ENABLED",
    missingWhenEnabled: () => (hasEnv("GOOGLE_DRIVE_WRITE_TOKEN") || hasEnv("GOOGLE_DRIVE_FOLDER_ID") ? [] : ["Google Drive file/folder write authorization and approved parent folder ID"]),
    allowedActions: ["Create folders inside approved parent", "Move files into approved folders", "Route documents to approved folders"],
    forbiddenActions: ["Delete", "Trash", "Permission changes", "Sharing changes", "File content reads without approval", "Moving files outside approved parent"]
  }
];

export function getLiveOperationsStatus(): LiveOperationsStatus {
  const liveOperationsEnabled = flagEnabled("LIVE_OPERATIONS_ENABLED");
  const services = serviceDefinitions.reduce<Record<LiveOperationServiceKey, LiveOperationServiceStatus>>((acc, definition) => {
    const enabled = liveOperationsEnabled && flagEnabled(definition.flag);
    const missing = enabled ? definition.missingWhenEnabled() : [definition.flag];

    acc[definition.key] = {
      key: definition.key,
      label: definition.label,
      enabled,
      blocked: missing.length > 0,
      missing,
      allowedActions: definition.allowedActions,
      forbiddenActions: definition.forbiddenActions
    };

    return acc;
  }, {} as Record<LiveOperationServiceKey, LiveOperationServiceStatus>);

  return {
    liveOperationsEnabled,
    dryRunRequired: true,
    ownerApprovalRequired: true,
    auditLoggingEnabled: liveOperationsEnabled && services.sheets.enabled && !services.sheets.blocked,
    auditTab: LIVE_OPERATIONS_AUDIT_TAB,
    services
  };
}

export function getServiceStatus(service: LiveOperationServiceKey): LiveOperationServiceStatus {
  return getLiveOperationsStatus().services[service];
}
