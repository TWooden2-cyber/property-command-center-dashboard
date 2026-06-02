"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Database,
  FileText,
  ListChecks,
  ListTodo,
  Lock,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import type { LiveOperationServiceKey, LiveOperationsStatus } from "@/types/sheets";

type ApiPayload = {
  ok: boolean;
  status: LiveOperationsStatus;
};

type SyncedTask = {
  id: string;
  title: string;
  notes: string;
  due: string;
  status: string;
  updated: string;
  completed: string;
  relatedProperty: string;
  relatedUnit: string;
  suggestedCategory: string;
  recommendationApproved: boolean;
  matchedKeywords: string[];
};

type DriveFileCandidate = {
  id: string;
  fileName: string;
  fileId: string;
  currentFolderName: string;
  currentFolderId: string;
  modifiedDate: string;
  suggestedCategory: string;
  suggestedProperty: string;
  suggestedUnit: string;
  proofType: string;
  vendorOrServiceType: string;
  sourceName: string;
  confidence: "High" | "Medium" | "Low";
  ownerConfirmed: boolean;
  destinationFolderPath: string;
  destinationFolderId: string;
  createDestinationFolder: string;
};

type OwnerUpdateForm = {
  property: string;
  unit: string;
  category: string;
  sheetTab: string;
  sheetTargetProperty: string;
  sheetTargetUnit: string;
  trackerTitle: string;
  updateMode: string;
  sheetFieldName: string;
  currentStatus: string;
  newStatus: string;
  ownerRemarks: string;
  nextAction: string;
  followUpDate: string;
  calendarDate: string;
  calendarTime: string;
  calendarTimeZone: string;
  calendarDuration: string;
  driveFileName: string;
  driveFileId: string;
  driveCurrentFolder: string;
  driveDestinationFolderPath: string;
  driveDestinationFolderId: string;
  driveCreateDestinationFolder: string;
  proofType: string;
  vendorOrServiceType: string;
  sourceName: string;
  proofStatus: string;
  vendorCompleted: string;
  tenantFollowUpNeeded: string;
  includeInMassPrompt: string;
};

type CommandItem = {
  id: string;
  category: string;
  property: string;
  unit: string;
  title: string;
  currentStatus: string;
  newStatus: string;
  ownerRemarks: string;
  source: "Dashboard" | "Google Tasks" | "Gmail" | "Drive" | "Sheets";
  timestamp: string;
  includeInMassPrompt: boolean;
  nextAction: string;
  followUpDate?: string;
  proofStatus: string;
  sheetTab?: string;
  sheetTargetProperty?: string;
  sheetTargetUnit?: string;
  trackerTitle?: string;
  updateMode?: string;
  sheetFieldName?: string;
  calendarDate?: string;
  calendarTime?: string;
  calendarTimeZone?: string;
  calendarDuration?: string;
  driveFileName?: string;
  driveFileId?: string;
  driveCurrentFolder?: string;
  driveDestinationFolderPath?: string;
  driveDestinationFolderId?: string;
  driveCreateDestinationFolder?: string;
  proofType?: string;
  vendorOrServiceType?: string;
  sourceName?: string;
  ownerApproved?: boolean;
};

type Plan = {
  sheets: string[];
  tasks: string[];
  calendar: string[];
  drive: string[];
  gmail: string[];
  audit: string[];
  riskLevel: "Normal" | "Watch" | "High";
  actionCount: number;
  approvalCount: number;
  executable: string[];
  needsInfo: string[];
  blocked: string[];
  missingInformation: string[];
};

type WorkflowResult = {
  dryRunId?: string;
  approved?: boolean;
  executed?: boolean;
  message: string;
  blocked?: boolean;
  rejected?: boolean;
};

const templates = [
  "Daily Operations Sync",
  "Maintenance Follow-Up Sync",
  "Missing Proof Sync",
  "Rent Collection Follow-Up Sync",
  "Drive Routing Sync",
  "Gmail Review Sync",
  "Calendar/Task Follow-Up Sync",
  "Full Mass Update Sync"
];

const filters = ["All", "Maintenance", "Rent", "Tasks", "Documents", "Gmail"];

const initialForm: OwnerUpdateForm = {
  property: "",
  unit: "",
  category: "Maintenance",
  sheetTab: "Maintenance",
  sheetTargetProperty: "",
  sheetTargetUnit: "",
  trackerTitle: "",
  updateMode: "update-or-create",
  sheetFieldName: "status",
  currentStatus: "",
  newStatus: "",
  ownerRemarks: "",
  nextAction: "",
  followUpDate: "",
  calendarDate: "",
  calendarTime: "",
  calendarTimeZone: "America/New_York",
  calendarDuration: "30",
  driveFileName: "",
  driveFileId: "",
  driveCurrentFolder: "",
  driveDestinationFolderPath: "",
  driveDestinationFolderId: "",
  driveCreateDestinationFolder: "yes",
  proofType: "Proof",
  vendorOrServiceType: "",
  sourceName: "",
  proofStatus: "",
  vendorCompleted: "no",
  tenantFollowUpNeeded: "no",
  includeInMassPrompt: "yes"
};

const seededItems: CommandItem[] = [
  {
    id: "detected-maintenance-complete",
    category: "Maintenance",
    property: "228 Reifert St",
    unit: "Unit 4",
    title: "Maintenance Task Completed",
    currentStatus: "Open",
    newStatus: "Waiting for Proof",
    ownerRemarks: "Vendor marked repair complete. Invoice/photo still needed.",
    source: "Google Tasks",
    timestamp: "Today",
    includeInMassPrompt: true,
    nextAction: "Request proof from vendor",
    proofStatus: "Missing",
    ownerApproved: false
  },
  {
    id: "detected-proof-missing",
    category: "Maintenance",
    property: "Property review",
    unit: "",
    title: "Proof Missing",
    currentStatus: "Vendor Complete",
    newStatus: "Proof Required",
    ownerRemarks: "Proof package is not attached yet.",
    source: "Sheets",
    timestamp: "Today",
    includeInMassPrompt: true,
    nextAction: "Create proof-needed follow-up",
    proofStatus: "Missing"
  },
  {
    id: "detected-rent-followup",
    category: "Rent",
    property: "Rent ledger",
    unit: "Multiple",
    title: "Rent Follow-Up Updated",
    currentStatus: "Needs Follow-Up",
    newStatus: "Owner Review",
    ownerRemarks: "Owner phone update indicates follow-up still needed.",
    source: "Google Tasks",
    timestamp: "Yesterday",
    includeInMassPrompt: true,
    nextAction: "Update rent notes and set next follow-up",
    proofStatus: ""
  },
  {
    id: "detected-utility-followup",
    category: "Utility",
    property: "Utilities",
    unit: "Common",
    title: "Utility Follow-Up Updated",
    currentStatus: "Review",
    newStatus: "Watch",
    ownerRemarks: "Utility status needs next action review.",
    source: "Dashboard",
    timestamp: "This week",
    includeInMassPrompt: false,
    nextAction: "Create shutoff-risk follow-up if needed",
    proofStatus: ""
  },
  {
    id: "detected-drive-doc",
    category: "Documents",
    property: "Maintenance",
    unit: "",
    title: "Document Detected in Drive",
    currentStatus: "Unrouted",
    newStatus: "Route Pending",
    ownerRemarks: "Document can be routed only after owner approval.",
    source: "Drive",
    timestamp: "Today",
    includeInMassPrompt: true,
    nextAction: "Propose destination folder",
    proofStatus: ""
  },
  {
    id: "detected-unread-email",
    category: "Gmail",
    property: "Vendor inbox",
    unit: "",
    title: "Unread Email Detected",
    currentStatus: "Unread",
    newStatus: "Review Selected Email",
    ownerRemarks: "Read only selected email metadata/body after approval.",
    source: "Gmail",
    timestamp: "Today",
    includeInMassPrompt: false,
    nextAction: "Open selected email only",
    proofStatus: ""
  }
];

function buildDriveDestination({
  category,
  property,
  unit,
  proofType,
  vendorOrServiceType,
  sourceName
}: {
  category: string;
  property: string;
  unit: string;
  proofType?: string;
  vendorOrServiceType?: string;
  sourceName?: string;
}) {
  const safeProperty = property?.trim() || "{property}";
  const safeUnit = unit?.trim() || "{unit}";
  const safeProofType = proofType?.trim() || "Proof";
  const safeVendor = vendorOrServiceType?.trim() || "Vendor or Service Type";
  const safeSource = sourceName?.trim() || "Source";

  switch (category) {
    case "Maintenance":
      return `02 Maintenance / ${safeProperty} / ${safeUnit} / Proof`;
    case "Rent Collection":
    case "Rent":
      return `01 Rent Collection / ${safeProperty} / ${safeUnit} / Proof`;
    case "Mortgage and Arrears":
      return `03 Mortgage and Arrears / ${safeProperty}`;
    case "Notices and Legal Holds":
      return `04 Notices and Legal Holds / ${safeProperty} / ${safeUnit}`;
    case "Utilities":
      return `05 Utilities / ${safeProperty}`;
    case "Lease Violations":
      return `06 Lease Violations / ${safeProperty} / ${safeUnit}`;
    case "Tenant Communications":
      return `07 Tenant Communications / ${safeProperty} / ${safeUnit}`;
    case "Vendor Communications":
      return `08 Vendor Communications / ${safeVendor}`;
    case "Weekly Command Reviews":
      return "09 Weekly Command Reviews";
    case "Proof Archive":
    case "Documents":
      return `10 Proof Archive / ${safeProperty} / ${safeUnit} / ${safeProofType}`;
    case "Source Data Exports":
      return `11 Source Data Exports / ${safeSource}`;
    case "Owner Approvals":
      return "12 Owner Approvals";
    default:
      return `10 Proof Archive / ${safeProperty} / ${safeUnit} / ${safeProofType}`;
  }
}

const seededDriveFiles: DriveFileCandidate[] = [
  {
    id: "drive-detected-maintenance-proof",
    fileName: "Invoice_228Reifert_KitchenSink.pdf",
    fileId: "",
    currentFolderName: "Review Queue",
    currentFolderId: "",
    modifiedDate: "2026-06-02",
    suggestedCategory: "Maintenance",
    suggestedProperty: "228 Reifert St",
    suggestedUnit: "Unit 4",
    proofType: "Proof",
    vendorOrServiceType: "Plumbing",
    sourceName: "Drive",
    confidence: "Medium",
    ownerConfirmed: false,
    destinationFolderPath: buildDriveDestination({
      category: "Maintenance",
      property: "228 Reifert St",
      unit: "Unit 4",
      proofType: "Proof"
    }),
    destinationFolderId: "",
    createDestinationFolder: "yes"
  }
];

function nowLabel() {
  return new Date().toLocaleString();
}

function serviceBadgeClass(source: string) {
  const key = source.toLowerCase();
  if (key.includes("sheet")) return "service-badge sheets";
  if (key.includes("task")) return "service-badge tasks";
  if (key.includes("calendar")) return "service-badge calendar";
  if (key.includes("drive") || key.includes("document")) return "service-badge drive";
  if (key.includes("gmail")) return "service-badge gmail";
  if (key.includes("success") || key.includes("complete")) return "service-badge success";
  if (key.includes("reject") || key.includes("cancel")) return "service-badge reject";
  return "service-badge";
}

function nextBusinessDayIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().slice(0, 10);
}

function defaultCalendarTime(item: CommandItem) {
  const text = `${item.category} ${item.title} ${item.ownerRemarks} ${item.proofStatus}`.toLowerCase();
  if (text.includes("rent")) return "12:30";
  if (text.includes("proof") || text.includes("maintenance")) return "08:30";
  return "08:30";
}

function sheetTabFor(item: CommandItem) {
  return item.sheetTab || (item.category === "Rent" ? "Rent Collection" : item.category === "Documents" ? "Proof Archive" : item.category || "Maintenance");
}

function isMissingExactUnit(value: string) {
  return !value.trim() || /multiple|all|unknown|n\/a/i.test(value);
}

function statusPrefix(status: "Executable" | "Needs More Info" | "Blocked") {
  return `[${status}]`;
}

function hasDestinationPlaceholders(destination: string) {
  return /{property}|{unit}|Vendor or Service Type|Source/i.test(destination);
}

function detectRecommendedActions(item: CommandItem) {
  const text = `${item.category} ${item.title} ${item.newStatus} ${item.ownerRemarks} ${item.nextAction} ${item.proofStatus}`.toLowerCase();
  const actions: Array<{ title: string; reason: string; service: string }> = [];

  if (text.includes("maintenance") && text.includes("proof received")) {
    actions.push({ title: "Update Maintenance Status", reason: "Proof was received and maintenance can be marked complete.", service: "Google Sheets" });
    actions.push({ title: "Log Proof Entry", reason: "Completed maintenance needs audit history.", service: "Google Sheets" });
  } else if (text.includes("maintenance") && (text.includes("proof missing") || text.includes("waiting for proof") || text.includes("proof required"))) {
    actions.push({ title: "Update Maintenance Status", reason: "Repair is not complete in the dashboard until proof is attached.", service: "Google Sheets" });
    actions.push({ title: "Create Task: Request Proof", reason: "Vendor proof is missing.", service: "Google Tasks" });
    actions.push({ title: "Create Follow-Up Reminder", reason: "Proof request needs a calendar checkpoint.", service: "Google Calendar" });
  }

  if (text.includes("rent")) {
    actions.push({ title: "Update Rent Collection", reason: "Rent follow-up status changed.", service: "Google Sheets" });
    actions.push({ title: "Create Rent Follow-Up Task", reason: "Balance or follow-up remains open.", service: "Google Tasks" });
  }

  if (text.includes("utility") || text.includes("shutoff")) {
    actions.push({ title: "Update Utility Status", reason: "Utility follow-up was detected.", service: "Google Sheets" });
  }

  if (text.includes("drive") || text.includes("document")) {
    actions.push({ title: "Move Document to Maintenance Folder", reason: "Detected document needs approved routing.", service: "Google Drive" });
  }

  if (text.includes("gmail") || text.includes("email")) {
    actions.push({ title: "Review Email", reason: "Only selected email read/review is allowed.", service: "Gmail Read" });
  }

  if (!actions.length) {
    actions.push({ title: "Update Tracker Notes", reason: "Owner remarks should be reflected in source tracker.", service: "Google Sheets" });
  }

  return actions;
}

function buildPlan(items: CommandItem[]): Plan {
  const sheets: string[] = [];
  const tasks: string[] = [];
  const calendar: string[] = [];
  const drive: string[] = [];
  const gmail: string[] = [];
  const audit: string[] = [];
  const executable: string[] = [];
  const needsInfo: string[] = [];
  const blocked: string[] = [];
  const missingInformation = new Set<string>();

  items.forEach((item) => {
    const sheetTab = sheetTabFor(item);
    const sheetProperty = item.sheetTargetProperty || item.property;
    const sheetUnit = item.sheetTargetUnit || item.unit;
    const trackerTitle = item.trackerTitle || item.title;
    const sheetField = item.sheetFieldName || "status/notes";
    const updateMode = item.updateMode || "update-or-create";
    const exactSheetTarget = Boolean(sheetTab && sheetProperty && trackerTitle && !isMissingExactUnit(sheetUnit || "N/A"));
    const sheetLine = `tab=${sheetTab} | property=${sheetProperty || "MISSING_PROPERTY"} | unit=${sheetUnit || "N/A"} | tracker/item title=${trackerTitle || "MISSING_TRACKER_TITLE"} | row match fields=property+unit+tracker/item title | update mode=${updateMode === "create" ? "create new row" : "update existing row; Create new row if no matching row exists."} | field name=${sheetField} | old value=${item.currentStatus || "not set"} | new value=${item.newStatus || "review"} | reason=${item.ownerRemarks || item.nextAction || "owner update"}`;
    sheets.push(`${statusPrefix(exactSheetTarget ? "Executable" : "Needs More Info")} ${sheetLine}`);
    if (exactSheetTarget) executable.push(`Sheet update: ${sheetLine}`);
    else {
      needsInfo.push(`Sheet update needs exact target fields: ${sheetLine}`);
      if (!sheetProperty) missingInformation.add("Sheet target property");
      if (isMissingExactUnit(sheetUnit || "")) missingInformation.add("Sheet target unit");
      if (!sheetTab) missingInformation.add("Sheet tab");
      if (!trackerTitle) missingInformation.add("Tracker/item title");
    }

    audit.push(`timestamp=now | service=${item.source} | action=${item.title} | approval=${item.ownerApproved ? "owner-approved keyword detected" : "pending owner approval"} | risk=Normal`);

    detectRecommendedActions(item).forEach((action) => {
      if (action.service === "Google Tasks") {
        const taskLine = `create/update task | title=${action.title} - ${item.title} | due=next follow-up | notes=${action.reason} | property=${item.property || "N/A"} | unit=${item.unit || "N/A"} | reason=${item.ownerRemarks || action.reason}`;
        tasks.push(`${statusPrefix("Executable")} ${taskLine}`);
        executable.push(`Google Task: ${taskLine}`);
      } else if (action.service === "Google Calendar") {
        const date = item.calendarDate || item.followUpDate || nextBusinessDayIso();
        const time = item.calendarTime || defaultCalendarTime(item);
        const timezone = item.calendarTimeZone || "America/New_York";
        const duration = item.calendarDuration || "30";
        const calendarLine = `create event | exact date=${date} | exact time=${time} | time zone=${timezone} | title=${action.title} - ${item.title} | duration=${duration} minutes | description=${action.reason}. ${item.ownerRemarks || ""} | property/unit=${item.property || "N/A"} ${item.unit || "N/A"} | reason=${action.reason}`;
        calendar.push(`${statusPrefix("Executable")} ${calendarLine}`);
        executable.push(`Calendar event: ${calendarLine}`);
      } else if (action.service === "Google Drive") {
        const hasExactFile = Boolean(item.driveFileId || item.driveFileName) && Boolean(item.ownerApproved);
        const autoDestination = item.driveDestinationFolderPath || buildDriveDestination({
          category: item.category,
          property: item.property,
          unit: item.unit,
          proofType: item.proofType || item.proofStatus,
          vendorOrServiceType: item.vendorOrServiceType,
          sourceName: item.sourceName
        });
        const hasDestination = Boolean(item.driveDestinationFolderId || (autoDestination && !hasDestinationPlaceholders(autoDestination)));
        if (hasExactFile && hasDestination) {
          const driveLine = `move file/create folder | exact file name=${item.driveFileName || "provided by file ID"} | exact file ID=${item.driveFileId || "not provided"} | current folder name/ID=${item.driveCurrentFolder || "not provided"} | exact destination folder path=${autoDestination} | destination folder ID=${item.driveDestinationFolderId || "not provided"} | create destination folder if missing=${item.driveCreateDestinationFolder || "yes"} | reason=${action.reason}`;
          drive.push(`${statusPrefix("Executable")} ${driveLine}`);
          executable.push(`Drive routing: ${driveLine}`);
        } else {
          const driveLine = `Drive review only - owner must select exact file before move. | file name=${item.driveFileName || "MISSING_FILE_NAME"} | file ID=${item.driveFileId || "MISSING_FILE_ID"} | auto-selected destination folder path=${autoDestination} | destination folder ID=${item.driveDestinationFolderId || "not provided"} | reason=${action.reason}`;
          drive.push(`${statusPrefix("Needs More Info")} ${driveLine}`);
          needsInfo.push(`Drive routing needs exact file/folder: ${driveLine}`);
          if (!hasExactFile) missingInformation.add("Drive file name or file ID");
          if (!hasExactFile) missingInformation.add("Owner confirmation of exact Drive file");
          if (!hasDestination) missingInformation.add("Drive destination folder");
        }
      } else if (action.service === "Gmail Read") {
        const gmailLine = `read selected email only | link selected email to queue | reason=${action.reason} | no sending/replying/deleting`;
        gmail.push(`${statusPrefix("Needs More Info")} ${gmailLine}`);
        needsInfo.push(`Gmail read needs selected email ID/thread: ${gmailLine}`);
        missingInformation.add("Selected Gmail email/thread");
      } else {
        const secondarySheetLine = `${action.title}: exact tab=${sheetTab} | property=${sheetProperty || "MISSING_PROPERTY"} | unit=${sheetUnit || "N/A"} | tracker/item title=${trackerTitle || "MISSING_TRACKER_TITLE"} | field name=${sheetField} | reason=${action.reason} | Create new row if no matching row exists.`;
        sheets.push(`${statusPrefix(exactSheetTarget ? "Executable" : "Needs More Info")} ${secondarySheetLine}`);
        if (exactSheetTarget) executable.push(`Sheet update: ${secondarySheetLine}`);
        else needsInfo.push(`Sheet recommendation needs exact target fields: ${secondarySheetLine}`);
      }
    });
  });

  const actionCount = [...sheets, ...tasks, ...calendar, ...drive, ...gmail, ...audit].length;
  const riskLevel = items.some((item) => /legal|notice|payment|tenant/i.test(`${item.category} ${item.title} ${item.ownerRemarks}`)) ? "High" : items.length > 3 ? "Watch" : "Normal";

  return {
    sheets,
    tasks,
    calendar,
    drive,
    gmail,
    audit,
    riskLevel,
    actionCount,
    approvalCount: items.filter((item) => !item.ownerApproved).length,
    executable,
    needsInfo,
    blocked,
    missingInformation: Array.from(missingInformation)
  };
}

function buildCodexPrompt(items: CommandItem[], plan: Plan, template: string) {
  const itemLines = items.map((item, index) => (
    `${index + 1}. ${item.category} | ${item.property || "No property"} ${item.unit || ""} | ${item.title} | ${item.currentStatus || "not set"} -> ${item.newStatus || "review"} | Remarks: ${item.ownerRemarks || "None"} | Source: ${item.source}`
  ));

  return `Generate and execute approved mass update plan for the following owner-reviewed items.

Template: ${template}

Selected completed/updated items:
${itemLines.join("\n") || "None selected."}

SECTION A - Execute these exact approved actions:
${plan.executable.map((item) => `- ${item}`).join("\n") || "- None. Do not execute incomplete items."}

SECTION B - Do not execute these incomplete items:
${plan.needsInfo.map((item) => `- ${item}`).join("\n") || "- None."}
${plan.blocked.map((item) => `- ${item}`).join("\n")}

SECTION C - Missing information needed:
${plan.missingInformation.map((item) => `- ${item}`).join("\n") || "- None."}

Proposed Sheet updates with executable validation:
${plan.sheets.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Calendar actions with executable validation:
${plan.calendar.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Drive routing actions with executable validation:
${plan.drive.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Gmail read actions:
${plan.gmail.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed Google Task updates from phone:
${plan.tasks.map((item) => `- ${item}`).join("\n") || "- None"}

Proposed audit log actions:
${plan.audit.map((item) => `- ${item}`).join("\n") || "- None"}

DO NOT:
- send Gmail
- reply to Gmail
- forward Gmail
- archive Gmail
- delete Gmail
- delete Drive files
- trash Drive files
- change Drive permissions
- share Drive files
- delete Calendar events
- delete Tasks
- perform legal/payment/tenant notice actions without explicit approval
- execute anything not listed in the approved plan

Dry-run is required. Owner approval is required. Audit logging is required.`;
}

export function LiveOperationsView() {
  const [status, setStatus] = useState<LiveOperationsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState("Full Mass Update Sync");
  const [activeFilter, setActiveFilter] = useState("All");
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<CommandItem[]>(seededItems);
  const [selected, setSelected] = useState<Record<string, boolean>>(Object.fromEntries(seededItems.map((item) => [item.id, item.includeInMassPrompt])));
  const [tasks, setTasks] = useState<SyncedTask[]>([]);
  const [taskMessage, setTaskMessage] = useState("No task sync run yet.");
  const [driveFiles, setDriveFiles] = useState<DriveFileCandidate[]>(seededDriveFiles);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<Record<string, boolean>>({});
  const [driveMessage, setDriveMessage] = useState("Review detected files, confirm the exact file, and let the system auto-fill the destination folder.");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [prompt, setPrompt] = useState("");
  const [workflow, setWorkflow] = useState<WorkflowResult>({ message: "Execution is locked until the plan is approved." });

  useEffect(() => {
    let active = true;

    fetch("/api/live-operations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load live operations status.");
        return response.json() as Promise<ApiPayload>;
      })
      .then((payload) => {
        if (active) setStatus(payload.status);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load live operations status.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (activeFilter === "All") return items;
    if (activeFilter === "Tasks") return items.filter((item) => item.source === "Google Tasks");
    if (activeFilter === "Documents") return items.filter((item) => item.category === "Documents" || item.source === "Drive");
    return items.filter((item) => item.category.toLowerCase().includes(activeFilter.toLowerCase()) || item.source.toLowerCase().includes(activeFilter.toLowerCase()));
  }, [activeFilter, items]);
  const selectedItems = useMemo(() => items.filter((item) => selected[item.id] && item.includeInMassPrompt), [items, selected]);
  const recommendations = useMemo(() => selectedItems.flatMap((item) => detectRecommendedActions(item).map((action) => ({ item, ...action }))), [selectedItems]);

  function updateItemRemarks(id: string, value: string) {
    setItems((previous) => previous.map((item) => item.id === id ? { ...item, ownerRemarks: value } : item));
  }

  function addFormItem() {
    const id = `dashboard-${Date.now()}`;
    const item: CommandItem = {
      id,
      category: form.category,
      property: form.property,
      unit: form.unit,
      title: `${form.category} Status Update`,
      currentStatus: form.currentStatus,
      newStatus: form.newStatus,
      ownerRemarks: form.ownerRemarks,
      source: "Dashboard",
      timestamp: nowLabel(),
      includeInMassPrompt: form.includeInMassPrompt === "yes",
      nextAction: form.nextAction,
      followUpDate: form.followUpDate,
      proofStatus: form.proofStatus,
      sheetTab: form.sheetTab,
      sheetTargetProperty: form.sheetTargetProperty || form.property,
      sheetTargetUnit: form.sheetTargetUnit || form.unit,
      trackerTitle: form.trackerTitle || `${form.category} Status Update`,
      updateMode: form.updateMode,
      sheetFieldName: form.sheetFieldName,
      calendarDate: form.calendarDate || form.followUpDate,
      calendarTime: form.calendarTime,
      calendarTimeZone: form.calendarTimeZone,
      calendarDuration: form.calendarDuration,
      driveFileName: form.driveFileName,
      driveFileId: form.driveFileId,
      driveCurrentFolder: form.driveCurrentFolder,
      driveDestinationFolderPath: form.driveDestinationFolderPath,
      driveDestinationFolderId: form.driveDestinationFolderId,
      driveCreateDestinationFolder: form.driveCreateDestinationFolder,
      ownerApproved: false
    };

    setItems((previous) => [item, ...previous]);
    setSelected((previous) => ({ ...previous, [id]: item.includeInMassPrompt }));
  }

  async function syncTasks() {
    setTaskMessage("Syncing Google Tasks updates...");
    const response = await fetch("/api/live-operations/tasks", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      setTaskMessage(payload.error || "Unable to sync Google Tasks.");
      return;
    }

    setTasks(payload.tasks || []);
    setTaskMessage(`${(payload.tasks || []).length} completed/updated Google Tasks loaded for review.`);
  }

  function addSelectedTasksToMassPrompt() {
    const taskItems = tasks.map<CommandItem>((task) => {
      const id = `task-${task.id}`;
      return {
        id,
        category: task.suggestedCategory,
        property: task.relatedProperty,
        unit: task.relatedUnit,
        title: task.title,
        currentStatus: task.status,
        newStatus: task.completed ? "Completed / Owner Updated" : "Updated / Needs Review",
        ownerRemarks: task.notes,
        source: "Google Tasks",
        timestamp: task.completed || task.updated || nowLabel(),
        includeInMassPrompt: true,
        nextAction: task.matchedKeywords.includes("PROOF MISSING") ? "Create proof follow-up" : "Review task update",
        followUpDate: "",
        proofStatus: task.matchedKeywords.includes("PROOF RECEIVED") ? "Received" : task.matchedKeywords.includes("PROOF MISSING") ? "Missing" : "",
        sheetTab: task.suggestedCategory === "Rent" ? "Rent Collection" : task.suggestedCategory,
        sheetTargetProperty: task.relatedProperty,
        sheetTargetUnit: task.relatedUnit,
        trackerTitle: task.title,
        updateMode: "update-or-create",
        sheetFieldName: "status/notes",
        calendarDate: "",
        calendarTime: "",
        calendarTimeZone: "America/New_York",
        calendarDuration: "30",
        driveCreateDestinationFolder: "yes",
        ownerApproved: task.recommendationApproved
      };
    });

    setItems((previous) => [...taskItems, ...previous.filter((item) => !taskItems.some((taskItem) => taskItem.id === item.id))]);
    setSelected((previous) => ({ ...previous, ...Object.fromEntries(taskItems.map((item) => [item.id, true])) }));
  }

  function updateDriveFile(id: string, patch: Partial<DriveFileCandidate>) {
    setDriveFiles((previous) => previous.map((file) => {
      if (file.id !== id) return file;
      const next = { ...file, ...patch };
      const shouldRemap = ["suggestedCategory", "suggestedProperty", "suggestedUnit", "proofType", "vendorOrServiceType", "sourceName"].some((key) => key in patch);
      return shouldRemap
        ? {
          ...next,
          destinationFolderPath: buildDriveDestination({
            category: next.suggestedCategory,
            property: next.suggestedProperty,
            unit: next.suggestedUnit,
            proofType: next.proofType,
            vendorOrServiceType: next.vendorOrServiceType,
            sourceName: next.sourceName
          })
        }
        : next;
    }));
  }

  function addSelectedDriveFilesToMassPrompt() {
    const selectedFiles = driveFiles.filter((file) => selectedDriveFiles[file.id]);
    if (!selectedFiles.length) {
      setDriveMessage("Select at least one Drive file before adding it to the mass prompt.");
      return;
    }

    const driveItems = selectedFiles.map<CommandItem>((file) => {
      const hasExactFile = Boolean(file.fileId || file.fileName);
      const id = `drive-${file.id}`;
      return {
        id,
        category: file.suggestedCategory,
        property: file.suggestedProperty,
        unit: file.suggestedUnit,
        title: `Route Drive File - ${file.fileName || "Exact file needed"}`,
        currentStatus: hasExactFile ? "File Confirmed" : "File Selection Required",
        newStatus: hasExactFile && file.ownerConfirmed ? "Route Pending" : "Needs Owner File Confirmation",
        ownerRemarks: hasExactFile
          ? "Destination auto-selected by category/property/unit. Owner confirmation still required before move."
          : "Drive review only - owner must select exact file before move.",
        source: "Drive",
        timestamp: file.modifiedDate || nowLabel(),
        includeInMassPrompt: true,
        nextAction: hasExactFile && file.ownerConfirmed ? "Generate Drive routing dry-run" : "Owner must confirm exact Drive file",
        proofStatus: file.proofType,
        sheetTab: "Proof Archive",
        sheetTargetProperty: file.suggestedProperty,
        sheetTargetUnit: file.suggestedUnit,
        trackerTitle: file.fileName || "Drive file review",
        updateMode: "update-or-create",
        sheetFieldName: "proofStatus/notes",
        driveFileName: file.fileName,
        driveFileId: file.fileId,
        driveCurrentFolder: [file.currentFolderName, file.currentFolderId].filter(Boolean).join(" / "),
        driveDestinationFolderPath: file.destinationFolderPath,
        driveDestinationFolderId: file.destinationFolderId,
        driveCreateDestinationFolder: file.createDestinationFolder,
        proofType: file.proofType,
        vendorOrServiceType: file.vendorOrServiceType,
        sourceName: file.sourceName,
        ownerApproved: file.ownerConfirmed
      };
    });

    setItems((previous) => [...driveItems, ...previous.filter((item) => !driveItems.some((driveItem) => driveItem.id === item.id))]);
    setSelected((previous) => ({ ...previous, ...Object.fromEntries(driveItems.map((item) => [item.id, true])) }));
    setDriveMessage(`${driveItems.length} Drive routing item(s) added with auto-filled destination folders.`);
  }

  function generatePlan() {
    const nextPlan = buildPlan(selectedItems);
    setPlan(nextPlan);
    setPrompt(buildCodexPrompt(selectedItems, nextPlan, template));
    setWorkflow({ message: "Dry-run plan generated. Portal approval does not run Codex." });
  }

  async function postStage(stage: "dry-run" | "approve" | "execute" | "cancel") {
    const response = await fetch("/api/live-operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "sheets" satisfies LiveOperationServiceKey,
        stage,
        dryRunId: workflow.dryRunId,
        approvalConfirmation: stage === "approve" || stage === "execute" ? "OWNER APPROVES" : "",
        actionType: "Owner Command Center Mass Update",
        targetName: `${selectedItems.length} owner-reviewed items`,
        oldValue: "",
        newValue: prompt.slice(0, 900),
        reason: `Owner generated ${template} mass update plan from mockup-style Live Operations Center.`
      })
    });
    const payload = await response.json();

    setWorkflow({
      dryRunId: payload.dryRunId || workflow.dryRunId,
      approved: Boolean(payload.approved || workflow.approved),
      executed: Boolean(payload.executed),
      blocked: !response.ok,
      rejected: stage === "cancel",
      message: payload.error || payload.result || (payload.dryRunId ? "Dry-run logged. Review and approve before execution." : payload.approved ? "I have reviewed the dry-run plan and approve these actions." : payload.cancelled ? "I do not approve this plan. Do not execute any actions." : "Workflow updated.")
    });
  }

  if (loading) return <LoadingState label="Loading owner command center..." />;
  if (error) return <ErrorState message={error} />;
  if (!status) return <EmptyState title="No live operations status" message="The live operations control layer did not return a status." />;

  return (
    <div className="mockup-live-shell">
      <main className="mockup-main">
        <header className="mockup-top-header">
          <div>
            <h2>Live Operations Center</h2>
            <p>Owner Command Generator & Mass Update Flow</p>
          </div>
          <div className="mockup-status-pills">
            <span>Operations Gate: <strong>ENABLED</strong></span>
            <span>Dry-Run: <strong>REQUIRED</strong></span>
            <span>Owner Approval: <strong>REQUIRED</strong></span>
            <span>Audit Logging: <strong>ENABLED</strong></span>
            <a href="#audit-preview">Live Operations Audit</a>
          </div>
        </header>

        <section className="mockup-card">
          <div className="mockup-card-heading"><span>1</span><div><p>OWNER COMMAND GENERATOR</p><h3>Quick Templates</h3></div></div>
          <div className="mockup-template-grid">
            {templates.map((item) => <button type="button" className={template === item ? "active" : ""} key={item} onClick={() => setTemplate(item)}>{item}</button>)}
          </div>
        </section>

        <section className="mockup-card">
          <div className="mockup-card-heading"><span>2</span><div><p>COMPLETED / UPDATED ITEMS</p><h3>Auto-Detected</h3></div></div>
          <div className="mockup-filter-row">
            {filters.map((item) => <button type="button" className={activeFilter === item ? "active" : ""} key={item} onClick={() => setActiveFilter(item)}>{item}</button>)}
          </div>
          <div className="mockup-detected-grid">
            {filteredItems.map((item) => (
              <article className="mockup-detected-card" key={item.id}>
                <div className="mockup-detected-top">
                  <ListChecks size={18} />
                  <div><strong>{item.title}</strong><small>{item.property || "No property"} {item.unit || ""}</small></div>
                  <span className={serviceBadgeClass(item.source)}>{item.source}</span>
                </div>
                <div className="mockup-detected-meta">
                  <span>{item.currentStatus || "Not set"} {"->"} {item.newStatus || "Review"}</span>
                  <span>{item.timestamp}</span>
                </div>
                <label className="mockup-include-row">
                  <input type="checkbox" checked={Boolean(selected[item.id])} onChange={(event) => setSelected((previous) => ({ ...previous, [item.id]: event.target.checked }))} />
                  Include
                </label>
                <textarea value={item.ownerRemarks} onChange={(event) => updateItemRemarks(item.id, event.target.value)} />
              </article>
            ))}
          </div>
          <div className="mockup-action-row">
            <button type="button" onClick={syncTasks}><RefreshCw size={16} />Refresh Detected Items</button>
            <button type="button" onClick={() => setSelected(Object.fromEntries(items.map((item) => [item.id, true])))}><CheckCircle2 size={16} />Select All</button>
            <button type="button" onClick={() => setSelected({})}><XCircle size={16} />Deselect All</button>
            <button type="button" onClick={addSelectedTasksToMassPrompt}><ListTodo size={16} />Add Selected to Mass Prompt</button>
          </div>
        </section>

        <div className="mockup-two-col">
          <section className="mockup-card">
            <div className="mockup-card-heading"><span>3</span><div><p>REMARKS / STATUS UPDATE PANEL</p><h3>Manual owner update</h3></div></div>
            <div className="mockup-form-grid">
              {[
                ["property", "Property"], ["unit", "Unit"], ["category", "Category"], ["currentStatus", "Current Status"],
                ["newStatus", "New Status"], ["nextAction", "Next Action"], ["followUpDate", "Follow-Up Date"], ["proofStatus", "Proof Status"],
                ["sheetTab", "Sheet Tab"], ["sheetTargetProperty", "Sheet Target Property"], ["sheetTargetUnit", "Sheet Target Unit"],
                ["trackerTitle", "Tracker / Item Title"], ["sheetFieldName", "Sheet Field Name"], ["calendarDate", "Calendar Follow-Up Date"],
                ["calendarTime", "Calendar Follow-Up Time"], ["calendarTimeZone", "Calendar Time Zone"], ["calendarDuration", "Calendar Duration Minutes"],
                ["driveFileName", "Drive File Name"], ["driveFileId", "Drive File ID"], ["driveCurrentFolder", "Current Folder Name/ID"],
                ["driveDestinationFolderPath", "Drive Destination Folder"], ["driveDestinationFolderId", "Destination Folder ID"],
                ["proofType", "Proof Type"], ["vendorOrServiceType", "Vendor / Service Type"], ["sourceName", "Source Name"]
              ].map(([key, label]) => <label key={key}><span>{label}</span><input value={form[key as keyof OwnerUpdateForm]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} /></label>)}
              <label><span>Sheet Update Mode</span><select value={form.updateMode} onChange={(event) => setForm((previous) => ({ ...previous, updateMode: event.target.value }))}><option value="update-or-create">Update existing; create new row if no match</option><option value="update-only">Update existing only</option><option value="create">Create new row</option></select></label>
              <label><span>Create Drive Folder If Missing</span><select value={form.driveCreateDestinationFolder} onChange={(event) => setForm((previous) => ({ ...previous, driveCreateDestinationFolder: event.target.value }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label><span>Vendor Completed</span><select value={form.vendorCompleted} onChange={(event) => setForm((previous) => ({ ...previous, vendorCompleted: event.target.value }))}><option value="no">No</option><option value="yes">Yes</option></select></label>
              <label><span>Tenant Follow-Up Needed</span><select value={form.tenantFollowUpNeeded} onChange={(event) => setForm((previous) => ({ ...previous, tenantFollowUpNeeded: event.target.value }))}><option value="no">No</option><option value="yes">Yes</option></select></label>
              <label><span>Include in Mass Prompt</span><select value={form.includeInMassPrompt} onChange={(event) => setForm((previous) => ({ ...previous, includeInMassPrompt: event.target.value }))}><option value="yes">Yes</option><option value="no">No</option></select></label>
              <label className="wide"><span>Owner Remarks</span><textarea value={form.ownerRemarks} onChange={(event) => setForm((previous) => ({ ...previous, ownerRemarks: event.target.value }))} /></label>
            </div>
            <div className="mockup-validation-note">
              Required for executable prompts: Sheet tab, exact property/unit, tracker title, Calendar date/time, and Drive file name or ID plus destination folder. Missing proof defaults to next business day at 8:30 AM; rent defaults to next business day at 12:30 PM.
            </div>
            <div className="mockup-action-row">
              <button type="button" onClick={addFormItem}><CheckCircle2 size={16} />Add to Mass Prompt</button>
              <button type="button" className="danger" onClick={() => setForm(initialForm)}><XCircle size={16} />Clear Form</button>
            </div>
          </section>

          <section className="mockup-card tasks-panel">
            <div className="mockup-card-heading"><span>4</span><div><p>GOOGLE TASKS SYNC INPUT</p><h3>Google Tasks Phone Sync</h3></div></div>
            <p>Tasks completed or updated on your phone can be pulled into this dashboard and converted into mass update items. Phone completion never executes changes automatically.</p>
            <div className="mockup-action-row">
              <button type="button" onClick={syncTasks}><RefreshCw size={16} />Sync Google Tasks Updates</button>
              <button type="button" onClick={syncTasks}><ListTodo size={16} />Review Completed Tasks</button>
              <button type="button" onClick={addSelectedTasksToMassPrompt}><CheckCircle2 size={16} />Add Selected Tasks to Mass Prompt</button>
            </div>
            <p className="mockup-task-message">{taskMessage}</p>
            <div className="mockup-task-list">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id}>
                  <strong>{task.title}</strong>
                  <span>{task.status || "needsAction"} | {task.due || "No due date"} | {task.suggestedCategory}</span>
                  <small>{task.relatedProperty || "No property detected"} {task.relatedUnit} | {task.matchedKeywords.join(", ") || "No keywords"}</small>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mockup-card">
          <div className="mockup-card-heading"><span>5</span><div><p>DRIVE FILE SELECTION / DESTINATION AUTO-MAPPING</p><h3>Owner confirms exact file; system fills destination</h3></div></div>
          <p>Drive routing never guesses the file. Select or confirm the exact file, then review the auto-selected destination folder based on category, property, unit, and proof type.</p>
          <div className="mockup-drive-grid">
            {driveFiles.map((file) => (
              <article className="mockup-drive-card" key={file.id}>
                <div className="mockup-drive-card-header">
                  <label className="mockup-include-row">
                    <input type="checkbox" checked={Boolean(selectedDriveFiles[file.id])} onChange={(event) => setSelectedDriveFiles((previous) => ({ ...previous, [file.id]: event.target.checked }))} />
                    Select
                  </label>
                  <span className={serviceBadgeClass(`drive ${file.confidence}`)}>Confidence: {file.confidence}</span>
                  <span className={file.ownerConfirmed ? "service-badge success" : "service-badge warning"}>{file.ownerConfirmed ? "Owner Confirmed" : "Confirmation Required"}</span>
                </div>
                <div className="mockup-form-grid">
                  <label><span>File Name</span><input value={file.fileName} onChange={(event) => updateDriveFile(file.id, { fileName: event.target.value })} /></label>
                  <label><span>File ID</span><input value={file.fileId} onChange={(event) => updateDriveFile(file.id, { fileId: event.target.value })} /></label>
                  <label><span>Modified Date</span><input value={file.modifiedDate} onChange={(event) => updateDriveFile(file.id, { modifiedDate: event.target.value })} /></label>
                  <label><span>Current Folder Name</span><input value={file.currentFolderName} onChange={(event) => updateDriveFile(file.id, { currentFolderName: event.target.value })} /></label>
                  <label><span>Current Folder ID</span><input value={file.currentFolderId} onChange={(event) => updateDriveFile(file.id, { currentFolderId: event.target.value })} /></label>
                  <label><span>Category</span><input value={file.suggestedCategory} onChange={(event) => updateDriveFile(file.id, { suggestedCategory: event.target.value })} /></label>
                  <label><span>Property</span><input value={file.suggestedProperty} onChange={(event) => updateDriveFile(file.id, { suggestedProperty: event.target.value })} /></label>
                  <label><span>Unit</span><input value={file.suggestedUnit} onChange={(event) => updateDriveFile(file.id, { suggestedUnit: event.target.value })} /></label>
                  <label><span>Proof Type</span><input value={file.proofType} onChange={(event) => updateDriveFile(file.id, { proofType: event.target.value })} /></label>
                  <label><span>Vendor / Service Type</span><input value={file.vendorOrServiceType} onChange={(event) => updateDriveFile(file.id, { vendorOrServiceType: event.target.value })} /></label>
                  <label><span>Source</span><input value={file.sourceName} onChange={(event) => updateDriveFile(file.id, { sourceName: event.target.value })} /></label>
                  <label><span>Create Destination If Missing</span><select value={file.createDestinationFolder} onChange={(event) => updateDriveFile(file.id, { createDestinationFolder: event.target.value })}><option value="yes">Yes</option><option value="no">No</option></select></label>
                  <label className="wide"><span>Auto-Selected Destination Folder Path</span><input value={file.destinationFolderPath} onChange={(event) => updateDriveFile(file.id, { destinationFolderPath: event.target.value })} /></label>
                  <label><span>Destination Folder ID</span><input value={file.destinationFolderId} onChange={(event) => updateDriveFile(file.id, { destinationFolderId: event.target.value })} /></label>
                  <label><span>Owner Confirmation</span><select value={file.ownerConfirmed ? "yes" : "no"} onChange={(event) => updateDriveFile(file.id, { ownerConfirmed: event.target.value === "yes" })}><option value="no">No - review only</option><option value="yes">Yes - exact file confirmed</option></select></label>
                </div>
              </article>
            ))}
          </div>
          <div className="mockup-validation-note">
            Approved parent: PROPERTY MANAGEMENT OPERATING SYSTEM / 1200_qPBmBz6KHjZY59HTPMpvXTCt5bGt. The destination is auto-selected, but the file remains non-executable until the owner confirms an exact file name or file ID.
          </div>
          <div className="mockup-action-row">
            <button type="button" onClick={() => setDriveMessage("Detected Drive files refreshed from the current review list. Live file moves still require owner-confirmed exact file selection.")}><RefreshCw size={16} />Refresh Detected Drive Files</button>
            <button type="button" onClick={addSelectedDriveFilesToMassPrompt}><CheckCircle2 size={16} />Add Selected Drive Files to Mass Prompt</button>
          </div>
          <p className="mockup-task-message">{driveMessage}</p>
        </section>

        <section className="mockup-card">
          <div className="mockup-card-heading"><span>6</span><div><p>RECOMMENDED NEXT ACTIONS</p><h3>Auto-Built</h3></div></div>
          <div className="mockup-recommendation-grid">
            {recommendations.length ? recommendations.map((item, index) => (
              <article key={`${item.item.id}-${index}`}>
                <ClipboardCheck size={18} />
                <div><strong>{item.title}</strong><p>{item.reason}</p></div>
                <span className={serviceBadgeClass(item.service)}>{item.service}</span>
              </article>
            )) : <article><AlertTriangle size={18} /><div><strong>No actions yet</strong><p>Select items and generate recommended actions.</p></div><span className="service-badge">Pending</span></article>}
          </div>
          <div className="mockup-action-row"><button type="button" onClick={generatePlan}><FileText size={16} />View Full Plan Details</button></div>
        </section>

        <section className="mockup-card mockup-plan-card">
          <div className="mockup-card-heading"><span>7</span><div><p>GENERATED MASS UPDATE PLAN</p><h3>Dry-Run</h3></div><span className={plan ? "service-badge success" : "service-badge warning"}>{plan ? "Dry-Run Ready" : "Not Ready"}</span></div>
          <div className="mockup-code-grid">
            {[
              ["GOOGLE SHEETS ACTIONS", plan?.sheets],
              ["GOOGLE TASK ACTIONS", plan?.tasks],
              ["GOOGLE CALENDAR ACTIONS", plan?.calendar],
              ["GOOGLE DRIVE ACTIONS", plan?.drive],
              ["GMAIL ACTIONS", plan?.gmail],
              ["AUDIT LOG ACTIONS", plan?.audit],
              ["APPROVED EXECUTABLE ACTIONS", plan?.executable],
              ["NEEDS MORE INFO - DO NOT EXECUTE", plan?.needsInfo],
              ["MISSING INFORMATION NEEDED", plan?.missingInformation]
            ].map(([title, values]) => <pre key={String(title)}><strong>{String(title)}</strong>{`\n${(values as string[] | undefined)?.length ? (values as string[]).map((value) => `- ${value}`).join("\n") : "- None proposed."}`}</pre>)}
          </div>
          <div className="mockup-plan-status">
            <span>Risk Level: <strong>{plan?.riskLevel || "Normal"}</strong></span>
            <span>Total Proposed Actions: <strong>{plan?.actionCount || 0}</strong></span>
            <span>Items Requiring Approval: <strong>{plan?.approvalCount || 0}</strong></span>
            <span>Executable: <strong>{plan?.executable.length || 0}</strong></span>
            <span>Needs More Info: <strong>{plan?.needsInfo.length || 0}</strong></span>
          </div>
        </section>

        <section className="mockup-card">
          <div className="mockup-card-heading"><span>8</span><div><p>OWNER COMMAND PREVIEW</p><h3>Copyable</h3></div></div>
          <textarea className="mockup-command-box" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <div className="mockup-action-row">
            <button type="button" onClick={() => navigator.clipboard.writeText(prompt)}><Copy size={16} />Copy Command</button>
            <button type="button" onClick={() => setWorkflow({ ...workflow, message: "Command saved in browser preview state." })}><FileText size={16} />Save Command</button>
            <button type="button" onClick={() => setWorkflow({ ...workflow, message: "Edit the command directly in the preview box." })}><ClipboardCheck size={16} />Edit Command</button>
            <button type="button" onClick={generatePlan}><RefreshCw size={16} />Regenerate Command</button>
          </div>
        </section>

        <div className="mockup-two-col">
          <section className="mockup-card">
            <div className="mockup-card-heading"><span>9</span><div><p>APPROVAL CONTROLS</p><h3>Review decision</h3></div></div>
            <p>I have reviewed the dry-run plan and approve these actions.</p>
            <p>I do not approve this plan. Do not execute any actions.</p>
            <div className="mockup-action-row">
              <button type="button" onClick={generatePlan}><PlayCircle size={16} />Generate Mass Update Plan</button>
              <button type="button" onClick={() => postStage("dry-run")}><ShieldCheck size={16} />Generate Dry Run</button>
              <button type="button" disabled={!workflow.dryRunId} onClick={() => postStage("approve")}><CheckCircle2 size={16} />Approve Plan</button>
              <button type="button" className="danger" onClick={() => postStage("cancel")}><XCircle size={16} />Reject Plan</button>
              <button type="button" className="danger" onClick={() => postStage("cancel")}><XCircle size={16} />Cancel / Hold</button>
            </div>
          </section>

          <section className="mockup-card execution-card">
            <div className="mockup-card-heading"><span>10</span><div><p>EXECUTION CONTROLS</p><h3>Locked Until Approved</h3></div></div>
            <p><Lock size={16} /> Execution is locked until the plan is approved.</p>
            <p>Execute only the approved actions in this plan. Portal approval does not auto-run Codex.</p>
            <div className="mockup-action-row">
              <button type="button" disabled={!workflow.dryRunId || !workflow.approved} onClick={() => postStage("execute")}><Database size={16} />Execute Approved Action</button>
              <button type="button" className="danger" onClick={() => postStage("cancel")}><XCircle size={16} />Cancel / Hold</button>
            </div>
            <p className={workflow.blocked || workflow.rejected ? "mockup-workflow-message blocked" : "mockup-workflow-message"}>{workflow.message}</p>
          </section>
        </div>

        <section className="mockup-card" id="audit-preview">
          <div className="mockup-card-heading"><span>11</span><div><p>LIVE OPERATIONS AUDIT</p><h3>Preview</h3></div></div>
          <div className="mockup-audit-grid">
            <span>timestamp</span><span>service</span><span>action type</span><span>approval status</span><span>result</span><span>risk level</span>
          </div>
          <div className="mockup-action-row"><button type="button"><FileText size={16} />View Audit Log</button></div>
        </section>

        <footer className="mockup-safety-footer">
          <strong>Safety Rules:</strong>
          <span>Dry-run Required</span>
          <span>Owner Approval Required</span>
          <span>Audit Logging Required</span>
          <span>No Deletes</span>
          <span>No Gmail Sending</span>
          <span>No Permission Changes</span>
        </footer>
      </main>
    </div>
  );
}
