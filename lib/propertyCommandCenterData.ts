export type HealthStatus = "Strong" | "Stable" | "Watch" | "Critical";
export type SignalTone = "green" | "yellow" | "red";

export type Period = {
  month: number;
  monthName: string;
  year: number;
  label: string;
};

export type RentCollectionRow = {
  id: string;
  month: string;
  property: string;
  unit: string;
  tenant: string;
  rentDue: number;
  paid: number;
  balance: number;
  dueDate?: string;
  datePaid?: string;
  method: string;
  lateFee: number;
  status: string;
  reminder: "Yes" | "No";
};

export type MaintenanceCommandRow = {
  id: string;
  dateReported: string;
  property: string;
  unit: string;
  tenant: string;
  issue: string;
  priority: "Critical" | "High" | "Normal" | "Low";
  assignedVendor: string;
  estimatedCost: number;
  actualCost?: number;
  status: string;
  dateCompleted: string;
  tenantUpdateSent: string;
  photosReceiptsLink: string;
  notes: string;
};

export type LeaseViolationRow = {
  id: string;
  date: string;
  property: string;
  unit: string;
  tenant: string;
  violationType: string;
  description: string;
  proofLink: string;
  messageSent: string;
  noticeRequired: string;
  followUpDate: string;
  status: string;
  notes: string;
};

export type NoticeCommandRow = {
  id: string;
  dateStarted: string;
  property: string;
  unit: string;
  tenant: string;
  noticeType: string;
  amountOwed: string;
  noticeDate: string;
  status: string;
};

export type DocumentDraftStatus = {
  id: string;
  document: string;
  status: string;
  tone: SignalTone;
  notes: string;
};

export type MortgageCommandRow = {
  id: string;
  property: string;
  mortgageDueMonthly: number;
  paymentSource: string;
  allotmentStatus: string;
  currentArrears: number;
  payoffPlan: string;
  dueDate: string;
  lastPaidDate: string;
  confirmationSaved: string;
  notes: string;
  paidThisMonth: number;
  nextOwnerAction: string;
};

export type FollowUpCommandRow = {
  id: string;
  date: string;
  time: string;
  property: string;
  unit: string;
  item: string;
  detail: string;
  category: string;
  calendarNeeded: string;
  emailNeeded: string;
  status: string;
};

export type AdminTaskCommandRow = {
  id: string;
  task: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  due: string;
  status: string;
};

export type MonthlyRentTrend = {
  month: string;
  projected: number;
  collected: number;
};

export const commandCenterPeriod: Period = {
  month: 5,
  monthName: "May",
  year: 2026,
  label: "May 2026"
};

export const dashboardNotifications = [
  "Last dashboard update: May 21, 2026, 9:00 AM local sample workbook",
  "Local sample data active",
  "No live Google data",
  "Owner approval required before live actions",
  "Critical maintenance follow-up open",
  "Mortgage posting confirmation pending"
];

export const rentRows: RentCollectionRow[] = [
  {
    id: "rent-1",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 1",
    tenant: "Greg Mckinney",
    rentDue: 900,
    paid: 0,
    balance: 935,
    dueDate: "May 1",
    method: "RentRedi Overdue Summary",
    lateFee: 35,
    status: "Payment Arrangement / Verify Ledger",
    reminder: "Yes"
  },
  {
    id: "rent-2",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 2",
    tenant: "Marc Gosselin",
    rentDue: 1350,
    paid: 1337.5,
    balance: 315,
    datePaid: "05/08/2026",
    method: "RentRedi / Overdue Summary Conflict",
    lateFee: 0,
    status: "Paid - Ledger Discrepancy",
    reminder: "Yes"
  },
  {
    id: "rent-3",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 3",
    tenant: "Marc Labicelle",
    rentDue: 1350,
    paid: 233,
    balance: 1117,
    datePaid: "04/29/2026",
    method: "RentRedi",
    lateFee: 0,
    status: "Paid",
    reminder: "No"
  },
  {
    id: "rent-4",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 4",
    tenant: "Kevin Royster",
    rentDue: 1350,
    paid: 0,
    balance: 1350,
    dueDate: "May 1",
    method: "",
    lateFee: 0,
    status: "Late",
    reminder: "Yes"
  },
  {
    id: "rent-5",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 5",
    tenant: "Alfred Reese",
    rentDue: 1350,
    paid: 610,
    balance: 740,
    datePaid: "05/04/2026",
    method: "RentRedi",
    lateFee: 0,
    status: "Paid",
    reminder: "No"
  },
  {
    id: "rent-6",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 7",
    tenant: "Alexandrea McCurdy",
    rentDue: 1000,
    paid: 1020,
    balance: 0,
    datePaid: "05/08/2026",
    method: "RentRedi / UPMC pending",
    lateFee: 20,
    status: "Paid in RentRedi / UPMC May rent unresolved",
    reminder: "Yes"
  },
  {
    id: "rent-7",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 7",
    tenant: "Alexandrea McCurdy",
    rentDue: 1000,
    paid: 1020,
    balance: 0,
    datePaid: "05/08/2026",
    method: "RentRedi",
    lateFee: 20,
    status: "Paid",
    reminder: "Yes"
  },
  {
    id: "rent-8",
    month: "May 2026",
    property: "4-Unit",
    unit: "Unit A",
    tenant: "Lacourtney Martin",
    rentDue: 949.95,
    paid: 480,
    balance: 469.95,
    datePaid: "05/08/2026",
    method: "PM / Cash Summary",
    lateFee: 0,
    status: "Section 8 Verification Needed",
    reminder: "No"
  },
  {
    id: "rent-9",
    month: "May 2026",
    property: "4-Unit",
    unit: "Unit B",
    tenant: "Courtney Swift",
    rentDue: 900,
    paid: 900,
    balance: 0,
    datePaid: "05/01/2026",
    method: "PM / Cash Summary",
    lateFee: 0,
    status: "Paid",
    reminder: "No"
  },
  {
    id: "rent-10",
    month: "May 2026",
    property: "4-Unit",
    unit: "Unit C",
    tenant: "Tiwanna Smith",
    rentDue: 895.95,
    paid: 895.95,
    balance: 0,
    datePaid: "05/02/2026",
    method: "PM / Cash Summary",
    lateFee: 0,
    status: "Paid",
    reminder: "No"
  },
  {
    id: "rent-11",
    month: "May 2026",
    property: "4-Unit",
    unit: "Unit D",
    tenant: "April Stewart",
    rentDue: 1049.95,
    paid: 1049.95,
    balance: 0,
    datePaid: "05/01/2026",
    method: "PM / Cash Summary",
    lateFee: 0,
    status: "Paid",
    reminder: "No"
  }
];

export const rentTotals = {
  projected: 12195.85,
  collected: 9653.4,
  balance: 3055,
  lateFees: 75
};

export const monthlyRentTrend: MonthlyRentTrend[] = [
  { month: "Jan", projected: 12195.85, collected: 11600 },
  { month: "Feb", projected: 12195.85, collected: 11825 },
  { month: "Mar", projected: 12195.85, collected: 10950 },
  { month: "Apr", projected: 12195.85, collected: 11240 },
  { month: "May", projected: 12195.85, collected: 9653.4 }
];

export const maintenanceRows: MaintenanceCommandRow[] = [
  {
    id: "maint-1",
    dateReported: "2026-05-12",
    property: "7-Unit",
    unit: "Unit 6 / Building Heat",
    tenant: "Jennifer Badger",
    issue:
      "Tenant reports heat is on in May and says she may need to sleep outside; mentions recent ER visit for breathing issues and believes Greg turned heat on.",
    priority: "Critical",
    assignedVendor: "TBD / Owner Verify",
    estimatedCost: 0,
    status: "Open",
    dateCompleted: "",
    tenantUpdateSent: "No",
    photosReceiptsLink: "RentRedi Gmail alert 05/12/2026",
    notes:
      "Health/safety-sensitive tenant communication. Verify heat/boiler control, whether any tenant is operating heat controls, and whether building heat can be adjusted/off safely. Respond in RentRedi and document."
  }
];

export const leaseViolations: LeaseViolationRow[] = [];

export const noticeRows: NoticeCommandRow[] = [
  {
    id: "notice-1",
    dateStarted: "2026-05-07",
    property: "7-Unit",
    unit: "Unit 2",
    tenant: "Marc Gosselin",
    noticeType: "10-Day Notice for Nonpayment / Ledger Conflict",
    amountOwed: "$315.00",
    noticeDate: "2026-05-07",
    status: "Ledger verification needed"
  },
  {
    id: "notice-2",
    dateStarted: "2026-05-07",
    property: "7-Unit",
    unit: "Unit 2",
    tenant: "Marc Gosselin",
    noticeType: "10-Day Notice for Nonpayment",
    amountOwed: "$0.00",
    noticeDate: "2026-05-07",
    status: "Draft status review"
  },
  {
    id: "notice-3",
    dateStarted: "2026-05-07",
    property: "7-Unit",
    unit: "Unit 6",
    tenant: "Jennifer Badger",
    noticeType: "10-Day Notice for Nonpayment",
    amountOwed: "$0.00",
    noticeDate: "2026-05-07",
    status: "Maintenance sensitivity"
  },
  {
    id: "notice-4",
    dateStarted: "2026-05-07",
    property: "7-Unit",
    unit: "Unit 7",
    tenant: "Alexandrea McCurdy",
    noticeType: "10-Day Notice for Nonpayment",
    amountOwed: "$0.00",
    noticeDate: "2026-05-07",
    status: "UPMC verification"
  },
  {
    id: "notice-5",
    dateStarted: "2026-05-11",
    property: "7-Unit",
    unit: "Unit 4",
    tenant: "Kevin Royster",
    noticeType: "Balance / Section 8 Contract Review",
    amountOwed: "Pending verification",
    noticeDate: "2026-05-11",
    status: "Owner review"
  }
];

export const documentDraftStatuses: DocumentDraftStatus[] = [
  {
    id: "doc-1",
    document: "10-day notice",
    status: "Needs verification",
    tone: "yellow",
    notes: "Draft status can be reviewed, but ledger conflicts and proof checks remain."
  },
  {
    id: "doc-2",
    document: "eviction packet",
    status: "Blocked by verification",
    tone: "red",
    notes: "Do not file. Missing final ledger/proof confirmation and owner legal review."
  }
];

export const mortgageRows: MortgageCommandRow[] = [
  {
    id: "mortgage-7",
    property: "7-Unit",
    mortgageDueMonthly: 2500,
    paymentSource: "Military paycheck / rental income",
    allotmentStatus: "Needs setup",
    currentArrears: 12745.9,
    payoffPlan:
      "MBFS emails received 2026-05-12 show payment requests accepted for $7,045.71 and $6,208.39, total $13,254.10. Apply expected Greg Mckinney payments ($900 May 20 and $900 May 30) and Kevin Royster Section 8 funds after they clear. Next goal: confirm lender posted both payments and get exact remaining cure/reinstatement balance.",
    dueDate: "Monthly",
    lastPaidDate: "2026-05-12",
    confirmationSaved: "Email confirmations found / final posting pending",
    notes:
      "Account was 244 days past due before payment. Need portal/lender proof that payments posted, updated balance, next due date, and confirmation foreclosure/legal action is paused.",
    paidThisMonth: 13254.1,
    nextOwnerAction: "Confirm lender posted both payments and request exact updated reinstatement/current balance."
  },
  {
    id: "mortgage-4",
    property: "4-Unit",
    mortgageDueMonthly: 2000,
    paymentSource: "Military paycheck / rental income",
    allotmentStatus: "Needs setup",
    currentArrears: 0,
    payoffPlan: "Keep current",
    dueDate: "Monthly",
    lastPaidDate: "",
    confirmationSaved: "Current sample status",
    notes: "Property manager takes 10% fee.",
    paidThisMonth: 2000,
    nextOwnerAction: "Set and verify monthly allotment process."
  }
];

export const followUpRows: FollowUpCommandRow[] = [
  {
    id: "follow-1",
    date: "Every 1st",
    time: "Morning",
    property: "All",
    unit: "All",
    item: "Rent Due Check",
    detail: "Confirm rent due and tenant reminders",
    category: "Rent Collection",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  },
  {
    id: "follow-2",
    date: "Every 5th",
    time: "Morning",
    property: "All",
    unit: "Unpaid Only",
    item: "Late Rent Review",
    detail: "Identify unpaid rent and decide notice/message",
    category: "Rent Collection",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  },
  {
    id: "follow-3",
    date: "Every Friday",
    time: "Evening",
    property: "All",
    unit: "All",
    item: "Weekly Property Admin Review",
    detail: "Rent, maintenance, notices, mortgage, and arrears check",
    category: "Dashboard",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "No Email",
    status: "Open"
  },
  {
    id: "follow-4",
    date: "2026-05-09",
    time: "09:00 AM",
    property: "7-Unit",
    unit: "Unit 3",
    item: "Rent Balance Follow-Up",
    detail: "Marc Labicelle partial May balance remains open",
    category: "Rent Collection",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  },
  {
    id: "follow-5",
    date: "2026-05-09",
    time: "10:00 AM",
    property: "7-Unit",
    unit: "Unit 4",
    item: "Notice Status Review",
    detail: "Kevin Royster May rent appears unpaid; verify balance and notice status",
    category: "Notices",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  },
  {
    id: "follow-6",
    date: "2026-05-20",
    time: "09:00 AM",
    property: "7-Unit",
    unit: "Unit 1",
    item: "Payment Arrangement Check",
    detail: "Greg Mckinney $900 arrangement payment due",
    category: "Rent Collection",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  },
  {
    id: "follow-7",
    date: "2026-05-30",
    time: "09:00 AM",
    property: "7-Unit",
    unit: "Unit 1",
    item: "Payment Arrangement Check",
    detail: "Greg Mckinney second $900 arrangement payment due",
    category: "Rent Collection",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  },
  {
    id: "follow-8",
    date: "2026-05-13",
    time: "09:00 AM",
    property: "7-Unit",
    unit: "All",
    item: "Mortgage Payment Confirmation",
    detail: "Confirm MBFS payment requests posted and get updated reinstatement/current balance",
    category: "Mortgage",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "No Email",
    status: "Open"
  },
  {
    id: "follow-9",
    date: "2026-05-13",
    time: "06:00 PM",
    property: "7-Unit",
    unit: "Unit 6 / Building Heat",
    item: "Safety/Maintenance Follow-Up",
    detail: "Jennifer Badger reported heat issue and breathing/ER concern",
    category: "Maintenance",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  },
  {
    id: "follow-10",
    date: "2026-05-14",
    time: "09:00 AM",
    property: "7-Unit",
    unit: "Common / Utilities",
    item: "Utility Account Follow-Up",
    detail: "Duquesne Light account/paperless setup confirmed",
    category: "Utilities",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "No Email",
    status: "Open"
  },
  {
    id: "follow-11",
    date: "2026-05-13",
    time: "10:00 AM",
    property: "7-Unit",
    unit: "Unit 7",
    item: "UPMC Direct Deposit / May Rent Follow-Up",
    detail: "UPMC asked about old check; owner confirmed checks received but May rent for Alexandrea not received",
    category: "Rent Collection",
    calendarNeeded: "Calendar Needed",
    emailNeeded: "Email As Needed",
    status: "Open"
  }
];

export const adminTaskRows: AdminTaskCommandRow[] = [
  { id: "task-1", task: "Update paid amounts from Gmail/RentRedi emails", priority: "High", due: "Daily until complete", status: "Updated - monitor remaining balances" },
  { id: "task-2", task: "Record $15,000 arrears payment and save lender confirmation", priority: "Critical", due: "2026-05-12", status: "Payment made - confirmation needed" },
  { id: "task-3", task: "Track payoff progress on $26,000 arrears", priority: "Critical", due: "Weekly", status: "Open" },
  { id: "task-4", task: "Monitor Greg Mckinney payment arrangement and confirm May 20 payment", priority: "High", due: "2026-05-20", status: "Open" },
  { id: "task-5", task: "Monitor Greg Mckinney payment arrangement and confirm May 30 payment", priority: "High", due: "2026-05-30", status: "Open" },
  { id: "task-6", task: "Follow up with Marc Labicelle on $250 lockout charge", priority: "High", due: "2026-05-09", status: "Complete" },
  { id: "task-7", task: "Verify Kevin Royster balance and determine notice status", priority: "Critical", due: "2026-05-11", status: "Still working" },
  { id: "task-8", task: "Update 4-unit tenant information and cash flow from uploaded rent roll/cash statement", priority: "High", due: "2026-05-11", status: "Complete" },
  { id: "task-9", task: "Request or enter 4-unit property manager May rent collection report", priority: "High", due: "2026-05-10", status: "Open" },
  { id: "task-10", task: "Reopen Marc Gosselin / Mark late balance", priority: "High", due: "2026-05-11", status: "Open" },
  { id: "task-11", task: "Close Marc Gosselin reminder issue", priority: "Medium", due: "2026-05-11", status: "Complete" },
  { id: "task-12", task: "Verify Lacourtney Martin Section 8/HAP payment status", priority: "High", due: "2026-05-12", status: "Open" },
  { id: "task-13", task: "Correct Unit D tenant record to April Stewart", priority: "Medium", due: "2026-05-11", status: "Complete" },
  { id: "task-14", task: "Import 4-unit expenses into expense database", priority: "High", due: "2026-05-11", status: "Complete" },
  { id: "task-15", task: "Confirm updated remaining arrears balance after MBFS payment requests post", priority: "Critical", due: "2026-05-13", status: "Open" },
  { id: "task-16", task: "Set up $2,500 monthly mortgage allotment for 7-unit", priority: "Critical", due: "ASAP", status: "Open" },
  { id: "task-17", task: "Save MBFS payment request confirmation emails to Drive or mortgage file", priority: "High", due: "2026-05-12", status: "Open" },
  { id: "task-18", task: "Respond to Jennifer Badger heat/breathing complaint and verify heat controls", priority: "Critical", due: "2026-05-13", status: "Open" },
  { id: "task-19", task: "Add Duquesne Light account/paperless setup to utility tracker", priority: "Medium", due: "2026-05-13", status: "Complete" },
  { id: "task-20", task: "Review all electric and sewer/sewage utility entries found in Drive", priority: "High", due: "2026-05-13", status: "Complete" },
  { id: "task-21", task: "Confirm MBFS payments posted after payment request accepted emails", priority: "Critical", due: "2026-05-13", status: "Open" }
];

export const monthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export const yearOptions = [2026, 2025];

export function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function toneForStatus(status: HealthStatus): SignalTone {
  if (status === "Critical") {
    return "red";
  }
  if (status === "Watch") {
    return "yellow";
  }
  return "green";
}

export function computeDashboardHealth() {
  const rentCollectionRate = rentTotals.collected / rentTotals.projected;
  const utilityCost = 403;
  const maintenanceCost = maintenanceRows.reduce((total, row) => total + (row.actualCost ?? row.estimatedCost), 0);
  const criticalMaintenance = maintenanceRows.some((row) => row.priority === "Critical" && row.status.toLowerCase() !== "complete");
  const mortgageArrears = mortgageRows.reduce((total, row) => total + row.currentArrears, 0);
  const confirmationPending = mortgageRows.some((row) => row.confirmationSaved.toLowerCase().includes("pending"));
  const noticeVerification = noticeRows.some((row) => row.status.toLowerCase().includes("verification"));

  const rentHealth: HealthStatus = rentCollectionRate >= 1 ? "Strong" : rentCollectionRate > 0.5 ? "Watch" : "Critical";
  const utilityHealth: HealthStatus = utilityCost > 550 ? "Critical" : "Stable";
  const maintenanceHealth: HealthStatus = criticalMaintenance || maintenanceCost > 500 ? "Critical" : "Stable";
  const mortgageHealth: HealthStatus = mortgageArrears > 0 ? "Critical" : confirmationPending ? "Watch" : "Stable";
  const noticeHealth: HealthStatus = noticeVerification ? "Watch" : "Stable";
  const overallHealth: HealthStatus = mortgageHealth === "Critical" || maintenanceHealth === "Critical" ? "Critical" : rentHealth === "Watch" || noticeHealth === "Watch" ? "Watch" : "Stable";

  return {
    overallHealth,
    rentCollectionRate,
    utilityCost,
    maintenanceCost,
    mortgageArrears,
    signals: [
      {
        label: "Rent collection",
        status: rentHealth,
        explanation:
          "Rent collection is below full collection because balances remain for Unit 1, Unit 2 ledger conflict, Unit 4, Unit A Section 8/HAP verification, and Unit 7 UPMC unresolved issue."
      },
      {
        label: "Utilities",
        status: utilityHealth,
        explanation:
          utilityCost > 550 ? "Utility cost is over the $550 threshold." : "Utility cost is under the $550 local threshold."
      },
      {
        label: "Maintenance",
        status: maintenanceHealth,
        explanation:
          "Maintenance risk increased because Unit 6 heat/breathing complaint is critical and open."
      },
      {
        label: "Mortgage",
        status: mortgageHealth,
        explanation:
          "Mortgage arrears remain because MBFS payment requests require final posted confirmation and updated lender balance."
      },
      {
        label: "Notice/legal",
        status: noticeHealth,
        explanation:
          "Notice/legal status is on watch because draft status is visible but ledger verification and proof checks are still needed."
      }
    ],
    causes: [
      "Rent balance increased because unpaid/verification balances remain for Unit 1, Unit 2 ledger conflict, Unit 4, Unit A Section 8/HAP verification, and Unit 7 UPMC unresolved issue.",
      "Mortgage arrears remain because MBFS payment requests require final posted confirmation and updated lender balance.",
      "Maintenance risk increased because Unit 6 heat/breathing complaint is critical and open.",
      "Admin workload increased because several high/critical tasks remain open."
    ]
  };
}
