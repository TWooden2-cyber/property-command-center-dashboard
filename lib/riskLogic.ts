import {
  type AdminTaskPriority,
  type AdminTaskStatus,
  type CalendarFollowUpRecord,
  type MaintenancePriority,
  type MortgageRisk,
  type NoticeCaseStage,
  type RentStatus,
  type RiskItem
} from "@/types/sheets";
import { dayDiff, includesAny, isBlank, parseLooseDate, startOfDay, titleCase } from "@/lib/formatters";

export function getRentStatus(amountPaid: number, balance: number, dueDate: string): RentStatus {
  if (balance <= 0) {
    return "Paid";
  }

  const due = parseLooseDate(dueDate);
  const late = due ? due < startOfDay() : false;

  if (late) {
    return "Needs Follow-Up";
  }

  if (amountPaid > 0 && balance > 0) {
    return "Partial";
  }

  return "Unpaid";
}

export function getRentNextAction(status: RentStatus): string {
  if (status === "Paid") {
    return "No action";
  }

  if (status === "Partial") {
    return "Follow up remaining balance";
  }

  return "Send late follow-up / review notice";
}

export function getNoticeCaseStage(input: {
  proofSaved: string;
  deadlineDate: string;
  resolution: string;
  notes: string;
  amountOwed: number;
}): NoticeCaseStage {
  const today = startOfDay();
  const deadline = parseLooseDate(input.deadlineDate);
  const proofSaved = String(input.proofSaved ?? "").trim().toLowerCase();
  const resolutionAndNotes = `${input.resolution} ${input.notes}`;
  const activeArrangement = includesAny(resolutionAndNotes, ["Payment arrangement active", "Hold", "Do not file"]);

  if (includesAny(input.resolution, ["resolved", "paid", "dismissed", "closed"])) {
    return "Resolved";
  }

  if (activeArrangement) {
    return "Payment Arrangement Active";
  }

  if (isBlank(input.proofSaved) || proofSaved === "no") {
    return "Proof Missing";
  }

  if (deadline && deadline < today && proofSaved === "yes" && input.amountOwed > 0) {
    return "Prepare Filing Packet";
  }

  if (deadline && deadline < today) {
    return "Deadline Expired";
  }

  if (deadline && dayDiff(today, deadline) <= 3) {
    return "Deadline Approaching";
  }

  if (deadline && deadline >= today && proofSaved === "yes") {
    return "Notice Served / Countdown Active";
  }

  return "Owner Review Required";
}

export function getNoticeNextOwnerAction(stage: NoticeCaseStage): string {
  switch (stage) {
    case "Resolved":
      return "No action";
    case "Payment Arrangement Active":
      return "Monitor arrangement and do not file while hold remains active";
    case "Proof Missing":
      return "Confirm proof of service is saved";
    case "Deadline Approaching":
      return "Review deadline and payment arrangement status";
    case "Deadline Expired":
      return "Review status before any next step";
    case "Notice Served / Countdown Active":
      return "Monitor countdown and balance";
    case "Prepare Filing Packet":
      return "Review filing packet checklist for owner approval";
    default:
      return "Review case details";
  }
}

export function getMaintenancePriority(issue: string, category: string): MaintenancePriority {
  const combined = `${issue} ${category}`;
  if (
    includesAny(combined, [
      "flood",
      "fire",
      "no heat",
      "electrical hazard",
      "gas",
      "sewage",
      "major leak",
      "burst pipe",
      "lockout",
      "safety"
    ])
  ) {
    return "Emergency";
  }

  if (category.trim().toLowerCase() === "water" || includesAny(issue, ["leak"])) {
    return "High";
  }

  return "Normal";
}

export function getMortgageRisk(allotmentStatus: string, currentArrears: number): MortgageRisk {
  if (allotmentStatus.trim().toLowerCase() === "needs setup" || currentArrears > 0) {
    return "Critical";
  }

  if (allotmentStatus && allotmentStatus.trim().toLowerCase() !== "active") {
    return "Watch";
  }

  return "Stable";
}

export function normalizeAdminPriority(value: string): AdminTaskPriority {
  const normalized = titleCase(value || "Normal");
  if (normalized === "Critical" || normalized === "High" || normalized === "Low") {
    return normalized;
  }

  return "Normal";
}

export function normalizeAdminStatus(value: string): AdminTaskStatus {
  const normalized = titleCase(value || "Open");

  if (normalized === "Complete" || normalized === "Waiting") {
    return normalized;
  }

  if (normalized === "Owner Review" || normalized === "Review") {
    return "Owner Review";
  }

  return "Open";
}

export function getCalendarGroup(dateValue: string): CalendarFollowUpRecord["group"] {
  const date = parseLooseDate(dateValue);
  const today = startOfDay();

  if (!date) {
    return "Later";
  }

  const diff = dayDiff(today, date);

  if (diff < 0) {
    return "Overdue";
  }

  if (diff === 0) {
    return "Today";
  }

  if (diff <= 7) {
    return "This Week";
  }

  return "Later";
}

export function getOwnerDecision(input: {
  mortgageAllotmentsNeedingSetup: number;
  outstandingRent: number;
  openNotices: number;
  openMaintenance: number;
}): string {
  if (input.mortgageAllotmentsNeedingSetup > 0) {
    return "Set up mortgage allotments first.";
  }

  if (input.outstandingRent > 0) {
    return "Review rent collection risk and follow up on unpaid balances.";
  }

  if (input.openNotices > 0) {
    return "Review notice deadlines, proof of service, and payment arrangements.";
  }

  if (input.openMaintenance > 0) {
    return "Review open maintenance and assign/confirm vendor action.";
  }

  return "System stable. Complete weekly admin review.";
}

export function buildRiskSummary(input: {
  outstandingRent: number;
  openNotices: number;
  filingPrepScheduled: number;
  mortgageAllotmentsNeedingSetup: number;
  currentArrears: number;
  openMaintenance: number;
  criticalAdminTasks: number;
}): RiskItem[] {
  return [
    {
      label: "Rent risk",
      level: input.outstandingRent > 0 ? "High" : "Stable",
      summary: input.outstandingRent > 0 ? "Outstanding rent remains open." : "No outstanding rent detected."
    },
    {
      label: "Legal/notice risk",
      level: input.filingPrepScheduled > 0 ? "Critical" : input.openNotices > 0 ? "High" : "Stable",
      summary:
        input.filingPrepScheduled > 0
          ? "At least one notice appears ready for filing packet review."
          : input.openNotices > 0
            ? "Open notice items need deadline review."
            : "No open notice risk detected."
    },
    {
      label: "Mortgage risk",
      level: input.mortgageAllotmentsNeedingSetup > 0 || input.currentArrears > 0 ? "Critical" : "Stable",
      summary:
        input.mortgageAllotmentsNeedingSetup > 0
          ? "One or more mortgage allotments need setup."
          : input.currentArrears > 0
            ? "Current arrears are present."
            : "Mortgage/allotment position looks stable."
    },
    {
      label: "Maintenance risk",
      level: input.openMaintenance > 0 ? "Watch" : "Stable",
      summary: input.openMaintenance > 0 ? "Open maintenance items need vendor confirmation." : "No open maintenance detected."
    },
    {
      label: "Admin task risk",
      level: input.criticalAdminTasks > 0 ? "High" : "Stable",
      summary: input.criticalAdminTasks > 0 ? "Critical admin tasks remain open." : "No critical admin task risk detected."
    }
  ];
}
