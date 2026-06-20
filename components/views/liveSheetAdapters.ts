import type {
  AdminTaskRecord,
  CalendarFollowUpRecord,
  MaintenanceRecord,
  MortgageArrearsRecord,
  NoticeRecord,
  RentRecord
} from "@/types/sheets";
import type {
  AdminTaskControlRow,
  FollowUpCommandRow,
  MaintenanceCommandRow,
  MortgageCommandRow,
  NoticeCommandRow,
  RentCollectionRow
} from "@/lib/propertyCommandCenterData";

function text(value: string | undefined, fallback = "Not provided") {
  return value && value.trim() ? value : fallback;
}

function moneyText(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function yesNoFromText(value: string | undefined, positiveWords: string[]) {
  const normalized = (value ?? "").toLowerCase();
  return positiveWords.some((word) => normalized.includes(word)) ? "Yes" : "No";
}

export function rentRecordToCommandRow(row: RentRecord): RentCollectionRow {
  return {
    id: row.id,
    month: row.month,
    property: row.property,
    unit: row.unit,
    tenant: row.tenant,
    rentDue: row.rentDue,
    paid: row.amountPaid,
    balance: row.balance,
    dueDate: row.dueDate,
    datePaid: row.datePaid,
    method: row.paymentMethod,
    lateFee: row.lateFee,
    status: row.status,
    reminder: yesNoFromText(row.nextAction, ["follow", "review", "verify", "contact"]) as "Yes" | "No"
  };
}

export function maintenanceRecordToCommandRow(row: MaintenanceRecord): MaintenanceCommandRow {
  const proofStatus = row.photosReceiptsLink || row.rentRediRequestLink || row.gmailMessageId ? "Saved" : "Missing";

  return {
    id: row.id,
    dateReported: row.dateReported,
    property: row.property,
    unit: row.unit,
    tenant: row.tenant,
    issue: row.issue,
    priority: row.priority === "Emergency" ? "Critical" : row.priority,
    assignedVendor: row.assignedVendor,
    estimatedCost: row.estimatedCost,
    actualCost: row.actualCost,
    status: row.status,
    dateCompleted: row.dateCompleted,
    tenantUpdateSent: row.tenantUpdateSent,
    photosReceiptsLink: row.photosReceiptsLink,
    proofStatus,
    ownerAction: row.notes,
    notes: row.notes
  };
}

export function noticeRecordToCommandRow(row: NoticeRecord): NoticeCommandRow {
  const proofStatus = [row.proofSaved, row.courtFilingStatus, row.trackingReceipt].filter(Boolean).join(" | ") || "Missing / Not confirmed";
  const blockedAction = [row.notes, row.mailingNotes, row.resolution].filter(Boolean).join(" | ");

  return {
    id: row.id,
    dateStarted: row.dateStarted,
    property: row.property,
    unit: row.unit,
    tenant: row.tenant,
    noticeType: row.noticeType,
    amountOwed: moneyText(row.amountOwed),
    noticeDate: row.noticeDate,
    status: row.caseStage,
    proofStatus,
    ownerAction: row.nextOwnerAction,
    blockedAction
  };
}

export function mortgageRecordToCommandRow(row: MortgageArrearsRecord): MortgageCommandRow {
  return {
    id: row.id,
    property: row.property,
    mortgageDueMonthly: row.mortgageDueMonthly,
    paymentSource: row.paymentSource,
    allotmentStatus: row.allotmentStatus,
    paidThisMonth: 0,
    currentArrears: row.currentArrears,
    payoffPlan: row.payoffPlan,
    dueDate: row.dueDate,
    lastPaidDate: row.lastPaidDate,
    confirmationSaved: row.confirmationSaved,
    notes: row.notes,
    nextOwnerAction: row.notes || (row.confirmationSaved ? "Review confirmation status" : "Confirm payment proof")
  };
}

export function adminTaskRecordToControlRow(row: AdminTaskRecord): AdminTaskControlRow {
  const combined = `${row.task} ${row.notes} ${row.emailNeeded} ${row.calendarNeeded} ${row.driveLink}`.toLowerCase();
  const blocked = combined.includes("block") || combined.includes("missing") || combined.includes("proof");

  return {
    id: row.id,
    taskTitle: row.task,
    relatedModule: row.taskArea,
    property: text(row.property, "All properties"),
    unit: text(row.unit, "All units"),
    priority: row.priority === "Normal" ? "Medium" : row.priority,
    status: row.status,
    ownerApprovalRequired: row.owner || row.status === "Owner Review" || blocked ? "Yes" : "No",
    proofNeeded: blocked ? "Yes" : "No",
    driveUpdateNeeded: row.driveLink || combined.includes("drive") ? "Yes" : "No",
    calendarTaskNeeded: row.calendarNeeded || combined.includes("calendar") || combined.includes("task") ? "Yes" : "No",
    blockedUntilVerified: blocked ? "Yes" : "No",
    dueDate: row.dueDate,
    resultNotes: row.notes,
    nextOwnerAction: [row.owner, row.emailNeeded, row.calendarNeeded].filter(Boolean).join(" | ") || row.notes
  };
}

export function calendarRecordToCommandRow(row: CalendarFollowUpRecord): FollowUpCommandRow {
  const combined = `${row.item} ${row.category} ${row.status} ${row.notes}`.toLowerCase();

  return {
    id: row.id,
    date: row.date,
    time: row.time,
    property: text(row.property, "All properties"),
    unit: text(row.unit, "All units"),
    item: row.item,
    detail: row.notes,
    category: row.category,
    status: row.status,
    calendarNeeded: yesNoFromText(combined, ["calendar", "schedule", "follow-up", "follow up"]) as "Yes" | "No",
    emailNeeded: yesNoFromText(combined, ["email", "gmail", "reply"]) as "Yes" | "No"
  };
}

export function flattenCalendarGroups(groups?: Record<CalendarFollowUpRecord["group"], CalendarFollowUpRecord[]>) {
  if (!groups) return [];
  return Object.values(groups).flat().map(calendarRecordToCommandRow);
}
