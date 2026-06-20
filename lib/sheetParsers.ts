import {
  SOURCE_TABS,
  type AdminTaskRecord,
  type DashboardBlock,
  type DashboardBlockRow,
  type DashboardRangeKey,
  type CalendarFollowUpRecord,
  type CommandCenterData,
  type KpiMetric,
  type MaintenanceRecord,
  type MortgageArrearsRecord,
  type NoticeRecord,
  type RentRecord,
  type RawSheetRow,
  type SourceTabName,
  type UtilityRecord,
  type WorkbookSnapshot
} from "@/types/sheets";
import { formatCurrency, includesAny, normalizeKey, parseLooseDate, toNumber } from "@/lib/formatters";
import {
  buildRiskSummary,
  getCalendarGroup,
  getMaintenancePriority,
  getMortgageRisk,
  getNoticeCaseStage,
  getNoticeNextOwnerAction,
  getOwnerDecision,
  getRentNextAction,
  getRentStatus,
  normalizeAdminPriority,
  normalizeAdminStatus
} from "@/lib/riskLogic";

type RowAliasMap = Record<string, string>;

function aliasMap(row: RawSheetRow): RowAliasMap {
  return Object.keys(row).reduce<RowAliasMap>((acc, key) => {
    acc[normalizeKey(key)] = key;
    return acc;
  }, {});
}

function pick(row: RawSheetRow, aliases: string[]): string {
  const map = aliasMap(row);
  for (const alias of aliases) {
    const key = map[normalizeKey(alias)];
    if (key) {
      return row[key] ?? "";
    }
  }

  return "";
}

function money(row: RawSheetRow, aliases: string[]): number {
  return toNumber(pick(row, aliases));
}

function rowId(tab: SourceTabName, index: number, row: RawSheetRow): string {
  const anchor = [pick(row, ["Property"]), pick(row, ["Unit", "Unit / Common Area"]), pick(row, ["Tenant"]), pick(row, ["Task", "Issue", "Utility Type"])]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${tab.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${index + 1}${anchor ? `-${anchor}` : ""}`;
}

function rows(snapshot: WorkbookSnapshot, tab: SourceTabName): RawSheetRow[] {
  return snapshot.tabs[tab]?.rows ?? [];
}

const DASHBOARD_HEADERS: Record<DashboardRangeKey, string[]> = {
  summary: ["Dashboard ID", "Generated Date", "Dashboard Status", "Overall Health Rating", "Total Tracker Items", "Open Items", "Closed Items", "Overdue Items", "Emergency Items"],
  metrics: ["Metric", "Value"],
  liveTrackers: ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Google Task ID", "Calendar Event ID", "Communication Ledger ID", "Google Drive Intake Row"],
  ownerDecisions: ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Safe Category Label", "Safe Action Label", "Approval Gate", "Review Status"],
  urgentActions: ["Tracker ID", "Urgency", "Priority", "Emergency Flag", "Overdue Flag", "Safe Action Label", "Approval Required", "Review Status"],
  maintenance: ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Google Task ID", "Calendar Event ID", "Communication Ledger ID", "Google Drive Intake Row"],
  googleDriveIntake: ["Row", "Source Type", "Tracker ID", "Review Status", "Proof Status Label", "Safe Action Label"],
  gmailIntake: ["Message ID", "Thread ID", "Source Type", "Tracker ID", "Review Status", "Safe Category Label", "Safe Action Label"],
  calendarFollowUps: ["Tracker ID", "Follow-Up Date", "Calendar Event ID", "Google Task ID", "Status", "Safe Follow-Up Label", "Approval Gate"]
};

function sameHeaders(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => normalizeKey(value) === normalizeKey(right[index] ?? ""));
}

function parseDashboardBlock(snapshot: WorkbookSnapshot, key: DashboardRangeKey): DashboardBlock {
  const raw = snapshot.dashboardBlocks[key];
  const configuredHeaders = DASHBOARD_HEADERS[key];

  if (!raw || !raw.ok || raw.empty) {
    return {
      key,
      title: raw?.title ?? key,
      range: raw?.range ?? "",
      headers: configuredHeaders,
      rows: [],
      ok: raw?.ok ?? false,
      empty: true,
      warning: raw?.warning,
      error: raw?.error
    };
  }

  const [firstRow = [], ...remainingRows] = raw.values;
  const hasHeaderRow = sameHeaders(firstRow, configuredHeaders);
  const headers = hasHeaderRow ? firstRow : configuredHeaders;
  const sourceRows = hasHeaderRow ? remainingRows : raw.values;
  const rows = sourceRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim().length > 0))
    .map<DashboardBlockRow>((row, index) => {
      const cells = headers.map((_, cellIndex) => String(row[cellIndex] ?? "").trim());
      return {
        id: `${key}-${index + 1}`,
        cells,
        values: headers.reduce<Record<string, string>>((acc, header, cellIndex) => {
          acc[header] = cells[cellIndex] ?? "";
          return acc;
        }, {})
      };
    });

  return {
    key,
    title: raw.title,
    range: raw.range,
    headers,
    rows,
    ok: true,
    empty: rows.length === 0,
    warning: raw.warning,
    error: raw.error
  };
}

function parseDashboardBlocks(snapshot: WorkbookSnapshot): Record<DashboardRangeKey, DashboardBlock> {
  return (Object.keys(DASHBOARD_HEADERS) as DashboardRangeKey[]).reduce<Record<DashboardRangeKey, DashboardBlock>>((acc, key) => {
    acc[key] = parseDashboardBlock(snapshot, key);
    return acc;
  }, {} as Record<DashboardRangeKey, DashboardBlock>);
}

function hasAnyValue(row: RawSheetRow, aliases: string[]): boolean {
  return aliases.some((alias) => pick(row, [alias]).trim().length > 0);
}

function parseMonthIdentity(month: string, fallbackStart: string, fallbackEnd: string) {
  const parsed = parseLooseDate(month) ?? parseLooseDate(fallbackStart) ?? parseLooseDate(fallbackEnd);

  if (parsed) {
    const year = String(parsed.getFullYear());
    const monthNumber = String(parsed.getMonth() + 1).padStart(2, "0");
    return {
      monthKey: `${year}-${monthNumber}`,
      monthLabel: new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(parsed),
      year
    };
  }

  const yearMatch = month.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch?.[1] ?? "";

  return {
    monthKey: year ? `${year}-${month || "unknown"}` : month || "unknown",
    monthLabel: month || "Not set",
    year
  };
}

export function parseRentCollection(snapshot: WorkbookSnapshot): RentRecord[] {
  return rows(snapshot, "Rent Collection").map((row, index) => {
    const amountPaid = money(row, ["Amount Paid", "Paid", "Collected"]);
    const balance = money(row, ["Balance", "Outstanding", "Outstanding Rent", "Rent Balance"]);
    const dueDate = pick(row, ["Due Date", "Rent Due Date"]);
    const status = getRentStatus(amountPaid, balance, dueDate);

    return {
      id: rowId("Rent Collection", index, row),
      month: pick(row, ["Month"]),
      property: pick(row, ["Property", "Address"]),
      unit: pick(row, ["Unit"]),
      tenant: pick(row, ["Tenant", "Resident"]),
      rentDue: money(row, ["Rent Due", "Scheduled Rent", "Monthly Rent"]),
      amountPaid,
      balance,
      dueDate,
      datePaid: pick(row, ["Date Paid", "Paid Date"]),
      paymentMethod: pick(row, ["Payment Method", "Method"]),
      lateFee: money(row, ["Late Fee", "Late Fees"]),
      status,
      nextAction: getRentNextAction(status)
    };
  });
}

export function parseNoticesEvictions(snapshot: WorkbookSnapshot): NoticeRecord[] {
  return rows(snapshot, "Notices & Evictions").map((row, index) => {
    const amountOwed = money(row, ["Amount Owed", "Balance", "Rent Balance"]);
    const base = {
      proofSaved: pick(row, ["Proof Saved", "Proof of Service Saved"]),
      deadlineDate: pick(row, ["Deadline Date", "Notice Deadline"]),
      resolution: pick(row, ["Resolution"]),
      notes: pick(row, ["Notes"]),
      amountOwed
    };
    const caseStage = (pick(row, ["Case Stage"]) || getNoticeCaseStage(base)) as NoticeRecord["caseStage"];

    return {
      id: rowId("Notices & Evictions", index, row),
      dateStarted: pick(row, ["Date Started", "Started"]),
      property: pick(row, ["Property", "Address"]),
      unit: pick(row, ["Unit"]),
      tenant: pick(row, ["Tenant", "Resident"]),
      noticeType: pick(row, ["Notice Type", "Type"]),
      amountOwed,
      noticeDate: pick(row, ["Notice Date", "Date Served"]),
      deadlineDate: base.deadlineDate,
      deliveryMethod: pick(row, ["Delivery Method", "Service Method"]),
      proofSaved: base.proofSaved,
      courtFilingStatus: pick(row, ["Court/Filing Status", "Court Filing Status", "Filing Status"]),
      resolution: base.resolution,
      notes: base.notes,
      mailingPrepDate: pick(row, ["Mailing Prep Date"]),
      mailingPrepTime: pick(row, ["Mailing Prep Time"]),
      mailFilingMethod: pick(row, ["Mail / Filing Method", "Mailing Method", "Filing Method"]),
      mailingStatus: pick(row, ["Mailing Status"]),
      trackingReceipt: pick(row, ["Tracking / Receipt", "Tracking", "Receipt"]),
      mailingNotes: pick(row, ["Mailing Notes"]),
      caseStage,
      nextOwnerAction: pick(row, ["Next Owner Action"]) || getNoticeNextOwnerAction(caseStage)
    };
  });
}

export function parseMaintenance(snapshot: WorkbookSnapshot): MaintenanceRecord[] {
  return rows(snapshot, "Maintenance").map((row, index) => {
    const issue = pick(row, ["Issue", "Maintenance Issue", "Request"]);
    const category = pick(row, ["Category"]);

    return {
      id: rowId("Maintenance", index, row),
      dateReported: pick(row, ["Date Reported", "Reported Date", "Date"]),
      property: pick(row, ["Property", "Address"]),
      unit: pick(row, ["Unit"]),
      tenant: pick(row, ["Tenant", "Resident"]),
      issue,
      category,
      priority: getMaintenancePriority(issue, category),
      assignedVendor: pick(row, ["Assigned Vendor", "Vendor"]),
      estimatedCost: money(row, ["Estimated Cost", "Estimate"]),
      actualCost: money(row, ["Actual Cost", "Cost"]),
      status: pick(row, ["Status"]) || "Open",
      dateCompleted: pick(row, ["Date Completed", "Completed Date"]),
      tenantUpdateSent: pick(row, ["Tenant Update Sent", "Update Sent"]),
      photosReceiptsLink: pick(row, ["Photos/Receipts Link", "Photos Link", "Receipts Link"]),
      rentRediRequestLink: pick(row, ["RentRedi Request Link", "RentRedi Link"]),
      gmailMessageId: pick(row, ["Gmail Message ID", "Gmail ID"]),
      notes: pick(row, ["Notes"])
    };
  });
}

export function parseMortgageArrears(snapshot: WorkbookSnapshot): MortgageArrearsRecord[] {
  const arrearsByProperty = new Map<string, { currentArrears: number; payoffPlan: string; dueDate: string; notes: string }>();

  for (const row of rows(snapshot, "Arrears Payoff Tracker")) {
    const property = pick(row, ["Property", "Address"]);
    if (!property) {
      continue;
    }

    arrearsByProperty.set(normalizeKey(property), {
      currentArrears: money(row, ["Current Arrears", "Arrears", "Balance"]),
      payoffPlan: pick(row, ["Payoff Plan", "Plan"]),
      dueDate: pick(row, ["Due Date"]),
      notes: pick(row, ["Notes"])
    });
  }

  const primaryRows = rows(snapshot, "Mortgage & Allotments");
  const sourceRows = primaryRows.length > 0 ? primaryRows : rows(snapshot, "Arrears Payoff Tracker");

  return sourceRows.map((row, index) => {
    const property = pick(row, ["Property", "Address"]);
    const arrears = arrearsByProperty.get(normalizeKey(property));
    const currentArrears = money(row, ["Current Arrears", "Arrears", "Balance"]) || arrears?.currentArrears || 0;
    const allotmentStatus = pick(row, ["Allotment Status", "Status"]);

    return {
      id: rowId("Mortgage & Allotments", index, row),
      property,
      mortgageDueMonthly: money(row, ["Mortgage Due Monthly", "Monthly Mortgage", "Mortgage Due"]),
      paymentSource: pick(row, ["Payment Source", "Source"]),
      allotmentStatus,
      currentArrears,
      payoffPlan: pick(row, ["Payoff Plan"]) || arrears?.payoffPlan || "",
      dueDate: pick(row, ["Due Date"]) || arrears?.dueDate || "",
      lastPaidDate: pick(row, ["Last Paid Date", "Last Paid"]),
      confirmationSaved: pick(row, ["Confirmation Saved", "Confirmation"]),
      notes: [pick(row, ["Notes"]), arrears?.notes].filter(Boolean).join(" "),
      risk: getMortgageRisk(allotmentStatus, currentArrears)
    };
  });
}

export function parseAdminTasks(snapshot: WorkbookSnapshot): AdminTaskRecord[] {
  return rows(snapshot, "Admin Task Log").map((row, index) => ({
    id: rowId("Admin Task Log", index, row),
    dateCreated: pick(row, ["Date Created", "Created Date", "Date"]),
    taskArea: pick(row, ["Task Area", "Area"]),
    property: pick(row, ["Property", "Address"]),
    unit: pick(row, ["Unit"]),
    task: pick(row, ["Task"]),
    priority: normalizeAdminPriority(pick(row, ["Priority"])),
    owner: pick(row, ["Owner", "Assigned To"]),
    dueDate: pick(row, ["Due Date"]),
    status: normalizeAdminStatus(pick(row, ["Status"])),
    emailNeeded: pick(row, ["Email Needed"]),
    calendarNeeded: pick(row, ["Calendar Needed"]),
    driveLink: pick(row, ["Drive Link", "Link"]),
    completedDate: pick(row, ["Completed Date", "Date Completed"]),
    notes: pick(row, ["Notes"])
  }));
}

export function parseCalendarFollowUps(snapshot: WorkbookSnapshot): CalendarFollowUpRecord[] {
  return rows(snapshot, "Calendar & Follow-Ups").map((row, index) => {
    const date = pick(row, ["Date", "Follow-Up Date", "Deadline Date", "Due Date"]);

    return {
      id: rowId("Calendar & Follow-Ups", index, row),
      date,
      time: pick(row, ["Time", "Follow-Up Time"]),
      property: pick(row, ["Property", "Address"]),
      unit: pick(row, ["Unit"]),
      tenant: pick(row, ["Tenant", "Resident"]),
      item: pick(row, ["Item", "Task", "Follow-Up", "Deadline"]),
      category: pick(row, ["Category", "Type"]),
      status: pick(row, ["Status"]),
      notes: pick(row, ["Notes"]),
      group: getCalendarGroup(date)
    };
  });
}

export function parseUtilities(snapshot: WorkbookSnapshot): UtilityRecord[] {
  return rows(snapshot, "Utilities")
    .filter((row) =>
      hasAnyValue(row, [
        "Month",
        "Property",
        "Unit / Common Area",
        "Utility Type",
        "Provider",
        "Usage Amount",
        "Total Cost",
        "Payment Status",
        "Review Status"
      ])
    )
    .map((row, index) => {
      const month = pick(row, ["Month"]);
      const billingPeriodStart = pick(row, ["Billing Period Start"]);
      const billingPeriodEnd = pick(row, ["Billing Period End"]);
      const monthIdentity = parseMonthIdentity(month, billingPeriodStart, billingPeriodEnd);
      const usageSpikeRaw = pick(row, ["Usage Spike?", "Usage Spike"]);
      const usageSpikeValue = usageSpikeRaw.trim().toLowerCase();
      const usageSpike = ["y", "yes", "true"].includes(usageSpikeValue) || usageSpikeValue.includes("spike");

      return {
        id: rowId("Utilities", index, row),
        month,
        ...monthIdentity,
        property: pick(row, ["Property", "Address"]),
        unitCommonArea: pick(row, ["Unit / Common Area", "Unit", "Common Area"]),
        utilityType: pick(row, ["Utility Type", "Type"]),
        provider: pick(row, ["Provider", "Utility Provider"]),
        accountNumber: pick(row, ["Account Number"]),
        billingPeriodStart,
        billingPeriodEnd,
        usageAmount: money(row, ["Usage Amount", "Usage"]),
        usageUnit: pick(row, ["Usage Unit", "Unit of Measure"]),
        totalCost: money(row, ["Total Cost", "Cost", "Bill Amount"]),
        costPerUnit: money(row, ["Cost Per Unit"]),
        dueDate: pick(row, ["Due Date"]),
        datePaid: pick(row, ["Date Paid", "Paid Date"]),
        paymentStatus: pick(row, ["Payment Status", "Status"]) || "Needs Entry",
        billReceiptLink: pick(row, ["Bill / Receipt Link", "Bill Link", "Receipt Link"]),
        usageSpike,
        reviewStatus: pick(row, ["Review Status"]) || (usageSpike ? "Needs Review" : "Complete"),
        notes: pick(row, ["Notes"]),
        dashboardInclude: pick(row, ["Dashboard Include?"])
      };
    });
}

function findMetric(rowsToSearch: RawSheetRow[], labels: string[]): number {
  for (const row of rowsToSearch) {
    const entries = Object.entries(row);
    const labelMatch = entries.some(([, value]) => includesAny(value, labels));
    if (!labelMatch) {
      continue;
    }

    const numeric = entries
      .map(([, value]) => toNumber(value))
      .find((value) => Number.isFinite(value) && value !== 0);

    if (numeric) {
      return numeric;
    }
  }

  return 0;
}

function kpi(label: string, value: string, helper: string, tone: KpiMetric["tone"] = "Normal"): KpiMetric {
  return { label, value, helper, tone };
}

function groupCalendar(rowsToGroup: CalendarFollowUpRecord[]): CommandCenterData["calendarFollowUps"] {
  return rowsToGroup.reduce<CommandCenterData["calendarFollowUps"]>(
    (acc, item) => {
      acc[item.group].push(item);
      return acc;
    },
    { Today: [], "This Week": [], Later: [], Overdue: [] }
  );
}

export function parseWorkbook(snapshot: WorkbookSnapshot): CommandCenterData {
  const dashboardBlocks = parseDashboardBlocks(snapshot);
  const rentCollection = parseRentCollection(snapshot);
  const noticesEvictions = parseNoticesEvictions(snapshot);
  const maintenance = parseMaintenance(snapshot);
  const mortgageArrears = parseMortgageArrears(snapshot);
  const adminTasks = parseAdminTasks(snapshot);
  const calendarFollowUps = parseCalendarFollowUps(snapshot);
  const utilities = parseUtilities(snapshot);

  const scheduledRent = rentCollection.reduce((sum, row) => sum + row.rentDue, 0);
  const rentCollected = rentCollection.reduce((sum, row) => sum + row.amountPaid, 0);
  const outstandingRent = rentCollection.reduce((sum, row) => sum + row.balance, 0);
  const openNotices = noticesEvictions.filter((row) => row.caseStage !== "Resolved").length;
  const currentArrears = mortgageArrears.reduce((sum, row) => sum + row.currentArrears, 0);
  const openMaintenance = maintenance.filter((row) => {
    const status = row.status.trim().toLowerCase();
    return !["complete", "completed", "closed", "resolved"].includes(status);
  }).length;
  const criticalAdminTasks = adminTasks.filter((row) => row.priority === "Critical" && row.status !== "Complete").length;
  const mortgageAllotmentsNeedingSetup = mortgageArrears.filter((row) => row.allotmentStatus.trim().toLowerCase() === "needs setup").length;
  const filingPrepScheduled = noticesEvictions.filter((row) => row.caseStage === "Prepare Filing Packet").length;
  const dashboardRows = rows(snapshot, "Dashboard");
  const cashFlowRows = rows(snapshot, "Cash Flow Summary");
  const maintenanceCosts = maintenance.reduce((sum, row) => sum + row.actualCost, 0);
  const mortgageDue = mortgageArrears.reduce((sum, row) => sum + row.mortgageDueMonthly, 0);
  const detectedNetCashFlow =
    findMetric([...dashboardRows, ...cashFlowRows], ["Net Cash Flow", "Cash Flow", "Net"]) ||
    rentCollected - maintenanceCosts - mortgageDue;

  const ownerDecision = getOwnerDecision({
    mortgageAllotmentsNeedingSetup,
    outstandingRent,
    openNotices,
    openMaintenance
  });

  const warnings = SOURCE_TABS.flatMap((tab) => {
    const sheet = snapshot.tabs[tab];
    if (!sheet) {
      return [`${tab}: not loaded.`];
    }

    if (sheet.warning) {
      return [`${tab}: ${sheet.warning}`];
    }

    if (sheet.error) {
      return [`${tab}: ${sheet.error}`];
    }

    return [];
  });

  return {
    overview: {
      kpis: [
        kpi("Scheduled Rent", formatCurrency(scheduledRent), "Rent due from tracker", "Normal"),
        kpi("Rent Collected", formatCurrency(rentCollected), "Payments recorded", "Stable"),
        kpi("Outstanding Rent", formatCurrency(outstandingRent), "Open balances", outstandingRent > 0 ? "High" : "Stable"),
        kpi("Net Cash Flow", formatCurrency(detectedNetCashFlow), "From cash flow summary or calculated from live rows", detectedNetCashFlow < 0 ? "High" : "Stable"),
        kpi("Open Notices", String(openNotices), "Notice cases requiring review", openNotices > 0 ? "High" : "Stable"),
        kpi("Current Arrears", formatCurrency(currentArrears), "Arrears payoff tracker", currentArrears > 0 ? "Critical" : "Stable"),
        kpi("Open Maintenance", String(openMaintenance), "Open work orders", openMaintenance > 0 ? "Watch" : "Stable"),
        kpi("Critical Admin Tasks", String(criticalAdminTasks), "Open critical tasks", criticalAdminTasks > 0 ? "High" : "Stable"),
        kpi(
          "Mortgage Allotments Needing Setup",
          String(mortgageAllotmentsNeedingSetup),
          "Allotment setup status",
          mortgageAllotmentsNeedingSetup > 0 ? "Critical" : "Stable"
        ),
        kpi("Filing Prep Scheduled", String(filingPrepScheduled), "For owner review only", filingPrepScheduled > 0 ? "Critical" : "Stable")
      ],
      ownerDecision,
      risks: buildRiskSummary({
        outstandingRent,
        openNotices,
        filingPrepScheduled,
        mortgageAllotmentsNeedingSetup,
        currentArrears,
        openMaintenance,
        criticalAdminTasks
      }),
      warnings
    },
    dashboardBlocks,
    rentCollection,
    noticesEvictions,
    maintenance,
    mortgageArrears,
    adminTasks,
    calendarFollowUps: groupCalendar(calendarFollowUps),
    utilities,
    system: snapshot.system
  };
}
