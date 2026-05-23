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
  month?: string;
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
  proofStatus?: string;
  ownerAction?: string;
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
  proofStatus?: string;
  ownerAction?: string;
  blockedAction?: string;
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
  category?: string;
  taskBadge?: "Verification Required" | "Owner Approval Required" | "Proof Needed" | "Blocked Until Verified" | "Ready for Review";
  blockedAction?: string;
  futureSyncStatus?: string;
};

export type AdminTaskControlRow = {
  id: string;
  taskTitle: string;
  relatedModule: string;
  property: string;
  unit: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: string;
  ownerApprovalRequired: "Yes" | "No";
  proofNeeded: "Yes" | "No";
  driveUpdateNeeded: "Yes" | "No";
  calendarTaskNeeded: "Yes" | "No";
  blockedUntilVerified: "Yes" | "No";
  dueDate: string;
  resultNotes: string;
  nextOwnerAction: string;
};

export type CommandActionCard = {
  id: string;
  actionType: string;
  status: string;
  tone: SignalTone;
  safetyLabels: string[];
  liveWriteDisabled: boolean;
  ownerApprovalRequired: boolean;
  willPrepare: string[];
  disclaimer: string;
};

export type CommandQueueItem = {
  id: string;
  title: string;
  detail: string;
  tone: SignalTone;
  meta: string;
};

export type CodexCommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  controls: string;
  safetyStatus: string;
  tone: SignalTone;
  prompt: string;
};

export type MonthlyRentTrend = {
  month: string;
  projected: number;
  collected: number;
};

export type MonthlyCashflowTrend = {
  month: string;
  projectedRent: number;
  rentCollected: number;
  utilities: number;
  maintenance: number;
  mortgagePaid: number;
  noi: number;
  cashflow: number;
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

export const monthlyCashflowTrend: MonthlyCashflowTrend[] = [
  {
    month: "Jan 2026",
    projectedRent: 12195.85,
    rentCollected: 11600,
    utilities: 488,
    maintenance: 260,
    mortgagePaid: 4500,
    noi: 6352,
    cashflow: 6352
  },
  {
    month: "Feb 2026",
    projectedRent: 12195.85,
    rentCollected: 11825,
    utilities: 522,
    maintenance: 410,
    mortgagePaid: 4500,
    noi: 6393,
    cashflow: 6393
  },
  {
    month: "Mar 2026",
    projectedRent: 12195.85,
    rentCollected: 10950,
    utilities: 570,
    maintenance: 725,
    mortgagePaid: 4500,
    noi: 5155,
    cashflow: 5155
  },
  {
    month: "Apr 2026",
    projectedRent: 12195.85,
    rentCollected: 11240,
    utilities: 545,
    maintenance: 315,
    mortgagePaid: 4500,
    noi: 5880,
    cashflow: 5880
  },
  {
    month: "May 2026",
    projectedRent: 12195.85,
    rentCollected: 9653.4,
    utilities: 403,
    maintenance: 0,
    mortgagePaid: 15254.1,
    noi: 4750.4,
    cashflow: -6003.7
  }
];

export const maintenanceRows: MaintenanceCommandRow[] = [
  {
    id: "maint-1",
    dateReported: "2026-05-12",
    month: "May 2026",
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
    proofStatus: "Missing",
    ownerAction: "Verify heat controls and determine vendor path",
    notes:
      "Health/safety-sensitive tenant communication. Verify heat/boiler control, whether any tenant is operating heat controls, and whether building heat can be adjusted/off safely. Respond in RentRedi and document."
  },
  {
    id: "maint-2",
    dateReported: "2026-05-03",
    month: "May 2026",
    property: "4-Unit",
    unit: "Common Area",
    tenant: "Common",
    issue: "Routine common-area cleaning completed after move-out turnover touch-up.",
    priority: "Normal",
    assignedVendor: "PM Cleaning Crew",
    estimatedCost: 150,
    actualCost: 150,
    status: "Complete",
    dateCompleted: "2026-05-04",
    tenantUpdateSent: "Not needed",
    photosReceiptsLink: "Local sample proof saved",
    proofStatus: "Saved",
    ownerAction: "No action needed",
    notes: "Local sample completed item for proof/completion tracking display only."
  },
  {
    id: "maint-3",
    dateReported: "2026-05-10",
    month: "May 2026",
    property: "7-Unit",
    unit: "Unit 2",
    tenant: "Marc Gosselin",
    issue: "Minor sink drain slow; tenant reports intermittent backup and requests vendor review.",
    priority: "High",
    assignedVendor: "TBD / Quote needed",
    estimatedCost: 225,
    status: "Waiting",
    dateCompleted: "",
    tenantUpdateSent: "No",
    photosReceiptsLink: "Not saved",
    proofStatus: "Missing",
    ownerAction: "Get quote and decide vendor path",
    notes: "Local sample pending quote item. Do not contact vendor from dashboard."
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
    status: "Hold / Verify Ledger",
    proofStatus: "Payment email found + overdue summary conflict",
    ownerAction: "Verify RentRedi ledger and payment allocation",
    blockedAction: "Do not serve/file until ledger is confirmed"
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
    status: "Closed / No Service",
    proofStatus: "Payment email found",
    ownerAction: "No action",
    blockedAction: "Closed duplicate/payment superseded"
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
    status: "Paid / Closed",
    proofStatus: "Payment email found",
    ownerAction: "Verify ledger only",
    blockedAction: "Do not mail/file unless ledger later shows balance"
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
    status: "Paid / Closed",
    proofStatus: "Payment email found",
    ownerAction: "Verify older balance only",
    blockedAction: "Do not mail/file unless ledger later shows balance"
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
    status: "Active Review",
    proofStatus: "Needs ledger and Section 8 verification",
    ownerAction: "Verify tenant portion, Section 8 payment status, and ledger",
    blockedAction: "Do not serve/escalate notice until verified"
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
    lastPaidDate: "Unknown / verify",
    confirmationSaved: "Pending / verify",
    notes: "Property manager takes 10% fee.",
    paidThisMonth: 2000,
    nextOwnerAction: "Keep current and verify recurring payment process."
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
  { id: "task-21", task: "Confirm MBFS payments posted after payment request accepted emails", priority: "Critical", due: "2026-05-13", status: "Open" },
  {
    id: "verify-1",
    task: "Confirm 7-Unit mortgage payments posted",
    category: "Mortgage Posting Confirmation",
    priority: "Critical",
    status: "Verification Required",
    taskBadge: "Verification Required",
    due: "ASAP",
    blockedAction: "Do not close mortgage tracker until lender proof is saved.",
    futureSyncStatus: "Ready for future sync"
  },
  {
    id: "verify-2",
    task: "Verify Unit 6 Jennifer Badger heat issue resolution",
    category: "Maintenance Completion Proof",
    priority: "Critical",
    status: "Proof Needed",
    taskBadge: "Proof Needed",
    due: "ASAP",
    blockedAction: "Do not close maintenance item until tenant/vendor confirmation is saved.",
    futureSyncStatus: "Ready for future sync"
  },
  {
    id: "verify-3",
    task: "Verify Unit 4 Kevin Royster Section 8 / balance status",
    category: "Section 8 / HAP Verification",
    priority: "Critical",
    status: "Owner Approval Required",
    taskBadge: "Owner Approval Required",
    due: "ASAP",
    blockedAction: "Do not serve/escalate notice until ledger and Section 8 status are verified.",
    futureSyncStatus: "Ready for future sync"
  },
  {
    id: "verify-4",
    task: "Verify 4-Unit Unit A Lacourtney Martin HAP payment",
    category: "Section 8 / HAP Verification",
    priority: "High",
    status: "Verification Required",
    taskBadge: "Verification Required",
    due: "ASAP",
    blockedAction: "Do not treat balance as tenant delinquency until HAP payment is verified.",
    futureSyncStatus: "Ready for future sync"
  },
  {
    id: "verify-5",
    task: "Confirm Greg Mckinney payment arrangement payment",
    category: "Rent Ledger Verification",
    priority: "High",
    status: "Verification Required",
    taskBadge: "Verification Required",
    due: "May 20 / May 30",
    blockedAction: "Do not escalate while arrangement is active.",
    futureSyncStatus: "Ready for future sync"
  },
  {
    id: "verify-6",
    task: "Review Codex drafted notice packet",
    category: "Notice Draft Review",
    priority: "High",
    status: "Ready for Owner Review",
    taskBadge: "Ready for Review",
    due: "ASAP",
    blockedAction: "Do not send, serve, file, or upload notice packet without owner approval.",
    futureSyncStatus: "Ready for future sync"
  }
];

export const adminTaskControlRows: AdminTaskControlRow[] = [
  {
    id: "ADMIN-2026-001",
    taskTitle: "Prepare Weekly Property Command Review",
    relatedModule: "Dashboard",
    property: "All",
    unit: "All",
    priority: "High",
    status: "Open",
    ownerApprovalRequired: "Yes",
    proofNeeded: "No",
    driveUpdateNeeded: "Yes",
    calendarTaskNeeded: "Yes",
    blockedUntilVerified: "No",
    dueDate: "Every Friday",
    resultNotes: "Weekly review should cover rent, maintenance, notices, mortgage, utilities, Drive, Calendar, and owner approvals.",
    nextOwnerAction: "Review weekly package before any live updates."
  },
  {
    id: "ADMIN-2026-002",
    taskTitle: "Update Google Drive Property Command Folder",
    relatedModule: "Google Drive",
    property: "All",
    unit: "All",
    priority: "High",
    status: "Open",
    ownerApprovalRequired: "Yes",
    proofNeeded: "Yes",
    driveUpdateNeeded: "Yes",
    calendarTaskNeeded: "No",
    blockedUntilVerified: "Yes",
    dueDate: "Daily",
    resultNotes: "Prepare preview package only. No Drive upload/move/rename/delete without approval.",
    nextOwnerAction: "Approve Drive update package after reviewing proof."
  },
  {
    id: "ADMIN-2026-003",
    taskTitle: "Verify Mortgage Payment Posting Proof",
    relatedModule: "Mortgage / Allotment",
    property: "7-Unit",
    unit: "All",
    priority: "Critical",
    status: "Open",
    ownerApprovalRequired: "Yes",
    proofNeeded: "Yes",
    driveUpdateNeeded: "Yes",
    calendarTaskNeeded: "Yes",
    blockedUntilVerified: "Yes",
    dueDate: "Immediate",
    resultNotes: "MBFS payment requests accepted but final lender posting proof is still needed.",
    nextOwnerAction: "Confirm lender posting and save proof."
  },
  {
    id: "ADMIN-2026-004",
    taskTitle: "Verify Unit 6 Maintenance Completion Proof",
    relatedModule: "Maintenance",
    property: "7-Unit",
    unit: "Unit 6",
    priority: "Critical",
    status: "Open",
    ownerApprovalRequired: "Yes",
    proofNeeded: "Yes",
    driveUpdateNeeded: "Yes",
    calendarTaskNeeded: "Yes",
    blockedUntilVerified: "Yes",
    dueDate: "Immediate",
    resultNotes: "Heat/breathing safety issue must remain open until proof or tenant/vendor confirmation is saved.",
    nextOwnerAction: "Confirm completion proof."
  },
  {
    id: "ADMIN-2026-005",
    taskTitle: "Review Unit 4 Section 8 / Balance Verification",
    relatedModule: "Notices / Evictions",
    property: "7-Unit",
    unit: "Unit 4",
    priority: "Critical",
    status: "Open",
    ownerApprovalRequired: "Yes",
    proofNeeded: "Yes",
    driveUpdateNeeded: "Yes",
    calendarTaskNeeded: "Yes",
    blockedUntilVerified: "Yes",
    dueDate: "Immediate",
    resultNotes: "Kevin Royster balance and Section 8 status must be verified before notice escalation.",
    nextOwnerAction: "Verify ledger and Section 8/HAP status."
  },
  {
    id: "ADMIN-2026-006",
    taskTitle: "Track Greg Mckinney Payment Arrangement",
    relatedModule: "Rent Collection",
    property: "7-Unit",
    unit: "Unit 1",
    priority: "High",
    status: "Open",
    ownerApprovalRequired: "No",
    proofNeeded: "Yes",
    driveUpdateNeeded: "Yes",
    calendarTaskNeeded: "Yes",
    blockedUntilVerified: "Yes",
    dueDate: "2026-05-20 and 2026-05-30",
    resultNotes: "Expected $900 payments on May 20 and May 30. Do not mark received until proof is verified.",
    nextOwnerAction: "Confirm payment proof."
  },
  {
    id: "ADMIN-2026-007",
    taskTitle: "Prepare Google Calendar / Task Sync Preview",
    relatedModule: "Calendar Follow-Ups",
    property: "All",
    unit: "All",
    priority: "Medium",
    status: "Open",
    ownerApprovalRequired: "Yes",
    proofNeeded: "No",
    driveUpdateNeeded: "No",
    calendarTaskNeeded: "Yes",
    blockedUntilVerified: "No",
    dueDate: "Weekly",
    resultNotes: "Preview only. No live Calendar or Task actions.",
    nextOwnerAction: "Review proposed events/tasks."
  },
  {
    id: "ADMIN-2026-008",
    taskTitle: "Review Dashboard Data Accuracy",
    relatedModule: "Dashboard",
    property: "All",
    unit: "All",
    priority: "High",
    status: "Open",
    ownerApprovalRequired: "Yes",
    proofNeeded: "Yes",
    driveUpdateNeeded: "Yes",
    calendarTaskNeeded: "No",
    blockedUntilVerified: "Yes",
    dueDate: "Weekly",
    resultNotes: "Confirm local sample values match verified ledgers, proof, and owner records before live migration.",
    nextOwnerAction: "Approve corrected source data."
  }
];

export const commandActionCards: CommandActionCard[] = [
  {
    id: "action-drive",
    actionType: "Prepare Google Drive Update",
    status: "Ready to prepare local package",
    tone: "green",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "Dashboard summary",
      "Rent collection snapshot",
      "Maintenance status",
      "Mortgage/arrears status",
      "Follow-up task list",
      "Proof-needed list",
      "Owner decision list"
    ],
    disclaimer: "No Google Drive files were created, moved, renamed, deleted, or updated."
  },
  {
    id: "action-gmail",
    actionType: "Track Gmail Follow-Ups",
    status: "Review needed before any communication",
    tone: "yellow",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "Emails needing reply",
      "Drafts needed",
      "Tenant/vendor follow-ups",
      "Proof emails that need to be saved",
      "Gmail body read disabled",
      "Live send disabled"
    ],
    disclaimer: "No Gmail messages were read, drafted, sent, archived, labeled, or deleted."
  },
  {
    id: "action-calendar",
    actionType: "Prepare Calendar Updates",
    status: "Calendar plan ready for owner review",
    tone: "green",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "Rent due check every 1st",
      "Late rent review every 5th",
      "Weekly property admin review every Friday",
      "Mortgage confirmation follow-up",
      "Maintenance safety follow-up"
    ],
    disclaimer: "No calendar events were created, updated, or deleted."
  },
  {
    id: "action-tasks",
    actionType: "Review Open Tasks",
    status: "Critical and high-priority queue active",
    tone: "red",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "Critical open tasks",
      "High priority open tasks",
      "Completed tasks",
      "Overdue or due-soon tasks",
      "Proof missing tasks",
      "Owner decision required tasks"
    ],
    disclaimer: "No Google Tasks were created, updated, completed, or deleted."
  },
  {
    id: "action-weekly",
    actionType: "Generate Weekly Command Review",
    status: "Draft review available from local sample data",
    tone: "yellow",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "Health summary",
      "Top risk changes",
      "Rent and arrears movement",
      "Maintenance and legal watch items",
      "Next owner decisions"
    ],
    disclaimer: "No reports were exported, emailed, uploaded, or shared."
  },
  {
    id: "action-owner-report",
    actionType: "Prepare Owner Decision Report",
    status: "Owner decisions require verification",
    tone: "yellow",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "Mortgage posting decision",
      "Notice/ledger verification decisions",
      "Maintenance safety follow-up decision",
      "Payment arrangement checkpoints"
    ],
    disclaimer: "No owner decisions were executed or sent."
  },
  {
    id: "action-proof",
    actionType: "Prepare Proof Checklist",
    status: "Proof gaps identified",
    tone: "red",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "MBFS posting proof",
      "Ledger conflict proof",
      "Notice proof review",
      "Maintenance communication proof",
      "Payment arrangement proof"
    ],
    disclaimer: "No proof files were created, saved, uploaded, moved, or renamed."
  },
  {
    id: "action-maintenance-package",
    actionType: "Prepare Maintenance Follow-Up Package",
    status: "Critical package needs owner review",
    tone: "red",
    safetyLabels: ["Draft Only", "Read Only", "Approval Required", "Live Write Disabled", "Owner Review Required"],
    liveWriteDisabled: true,
    ownerApprovalRequired: true,
    willPrepare: [
      "Unit 6 heat/breathing issue summary",
      "Vendor/owner verification checklist",
      "Tenant update reminder",
      "Photos/receipts reference list",
      "Documentation notes"
    ],
    disclaimer: "No tenant, vendor, or maintenance messages were sent."
  }
];

export const codexCommandTemplates: CodexCommandTemplate[] = [
  {
    id: "drive-update",
    title: "Codex Command - Google Drive Update Package",
    actionName: "Generate Codex Command: Google Drive Update",
    controls: "Drive package preview, proof checklist, owner decision list, and follow-up bundle.",
    safetyStatus: "Draft command only. Dashboard live write disabled.",
    tone: "green",
    prompt: `Run a Google Drive update package for the Property Command Center.

Rules:
- Do not upload, move, rename, delete, or update Drive files without owner approval.
- First generate a Drive update preview only.
- Use current dashboard data and tracker context.
- Prepare these sections:
  1. Dashboard summary
  2. Operation health
  3. Rent collection snapshot
  4. Utility status
  5. Maintenance status
  6. Mortgage/arrears status
  7. Proof-needed checklist
  8. Owner decision list
  9. Follow-up/suspense list
  10. Admin task status
- Report exactly what files or folders would be updated.
- Stop and ask for owner approval before any live Google Drive write.`
  },
  {
    id: "gmail-tracking",
    title: "Codex Command - Gmail Tracking Update",
    actionName: "Generate Codex Command: Gmail Tracking Update",
    controls: "Gmail metadata review, reply queue, proof email tracking, and owner approval checkpoints.",
    safetyStatus: "Metadata/search first. Dashboard live send disabled.",
    tone: "yellow",
    prompt: `Run a Gmail tracking review for the Property Command Center.

Rules:
- Metadata/search first.
- Do not read Gmail message bodies unless owner approves.
- Do not send, draft, archive, label, delete, or forward emails without owner approval.
- Identify:
  1. RentRedi follow-ups
  2. Tenant/vendor replies needed
  3. Mortgage proof emails
  4. Maintenance proof emails
  5. Section 8/HAP payment verification emails
  6. Utility emails or bills needing tracking
  7. Emails that should be saved to Drive
  8. Emails tied to open dashboard tasks
- Produce a Gmail tracking preview only.
- Stop and ask for owner approval before any Gmail body read or live action.`
  },
  {
    id: "calendar-prep",
    title: "Codex Command - Calendar Update Prep",
    actionName: "Generate Codex Command: Calendar Update Prep",
    controls: "Calendar preview for rent, mortgage, maintenance, utilities, and owner review follow-ups.",
    safetyStatus: "Preview only. Dashboard event creation disabled.",
    tone: "green",
    prompt: `Prepare Google Calendar updates for the Property Command Center.

Rules:
- Do not create, update, or delete calendar events without owner approval.
- Generate a calendar update preview only.
- Use current dashboard follow-up and suspense items.
- Prepare calendar events for:
  1. Rent due check every 1st
  2. Late rent review every 5th
  3. Weekly property admin review every Friday
  4. Mortgage payment confirmation follow-up
  5. Maintenance safety follow-up
  6. Utility bill review follow-ups
  7. Payment arrangement follow-ups
  8. Owner decision review items
- Show proposed event title, date/time, description, and trigger prompt.
- Stop and ask for owner approval before creating or changing any calendar event.`
  },
  {
    id: "tasks-review",
    title: "Codex Command - Google Tasks Review",
    actionName: "Generate Codex Command: Task Completion Review",
    controls: "Task completion preview, blocked-task review, proof-needed items, and owner decisions.",
    safetyStatus: "Review only. Dashboard task writes disabled.",
    tone: "red",
    prompt: `Prepare a Google Tasks completion review for the Property Command Center.

Rules:
- Do not create, update, complete, or delete Google Tasks without owner approval.
- Generate a task review preview only.
- Review dashboard task data and identify:
  1. Critical open tasks
  2. High priority open tasks
  3. Due-soon tasks
  4. Overdue tasks
  5. Utility tracking tasks
  6. Completed tasks that need proof
  7. Tasks blocked by missing verification
  8. Owner decision required tasks
  9. Verification tasks
  10. Approval tasks
  11. Proof-needed tasks
  12. Tasks ready for future Google Tasks sync
- Recommend which tasks should be created, updated, completed, or left open.
- Stop and ask for owner approval before any live Google Tasks action.`
  },
  {
    id: "verification-tasks",
    title: "Codex Command - Verification Tasks Update",
    actionName: "Generate Codex Command: Verification Tasks Update",
    controls: "Verification-required, owner-approval, proof-needed, blocked, and ready-for-review task preview.",
    safetyStatus: "Preview only. Live Google Tasks creation disabled.",
    tone: "yellow",
    prompt: `Update the Property Command Center verification and approval tasks.

Rules:
- Do not create, update, complete, or delete live Google Tasks without owner approval.
- Prepare a task update preview only.
- Review verification-required tasks, owner-approval tasks, proof-needed tasks, blocked tasks, and ready-for-review tasks.
- Recommend which tasks should stay open, be marked complete, or be prepared for future Google Tasks sync.
- Stop before any live Google Tasks action.`
  },
  {
    id: "daily-sync",
    title: "Codex Command - Full Daily Command Sync",
    actionName: "Generate Codex Command: Full Daily Command Sync",
    controls: "Full local command review across health, rent, utilities, maintenance, legal holds, mortgage, Gmail, Drive, Calendar, and Tasks.",
    safetyStatus: "Read-only/local review first. Stop before all live writes.",
    tone: "yellow",
    prompt: `Run the Property Command Center Daily Sync.

Rules:
- Read-only/local review first.
- Do not perform live Google Drive, Gmail, Calendar, Google Tasks, Google Sheets, tenant, legal, payment, mortgage, or notice actions without owner approval.
- Prepare a daily command report covering:
  1. Operation health
  2. Rent collection status
  3. Utility status by electric, gas, water, sewer, trash, and other
  4. Maintenance status
  5. Notices/legal hold status
  6. Mortgage/arrears status
  7. Gmail tracking needs
  8. Google Drive update needs
  9. Calendar update needs
  10. Google Tasks completion needs
  11. Owner approvals required
  12. Blocked-until-verified items
- End with a clear approval list.
- Stop before all live writes.`
  }
];

export const todayCommandBrief: CommandQueueItem[] = [
  {
    id: "brief-1",
    title: "Confirm MBFS payment posting",
    detail: "Get exact updated reinstatement/current balance and confirmation that foreclosure/legal action is paused.",
    tone: "red",
    meta: "Mortgage / owner decision"
  },
  {
    id: "brief-2",
    title: "Resolve Unit 6 heat and breathing complaint",
    detail: "Verify heat controls, document findings, and prepare owner-approved response path.",
    tone: "red",
    meta: "Maintenance safety"
  },
  {
    id: "brief-3",
    title: "Review rent verification conflicts",
    detail: "Unit 1 arrangement, Unit 2 ledger conflict, Unit 4 unpaid review, Unit A HAP check, and Unit 7 UPMC issue remain visible.",
    tone: "yellow",
    meta: "Rent collection"
  }
];

export const nextSevenDaysQueue: CommandQueueItem[] = [
  {
    id: "next-1",
    title: "Greg Mckinney arrangement payment",
    detail: "Confirm May 20 expected $900 payment and ledger posting.",
    tone: "yellow",
    meta: "2026-05-20"
  },
  {
    id: "next-2",
    title: "Weekly property admin review",
    detail: "Review rent, notices, maintenance, mortgage posting, and proof gaps.",
    tone: "green",
    meta: "Every Friday"
  },
  {
    id: "next-3",
    title: "Utility tracker follow-up",
    detail: "Keep Duquesne Light account/paperless setup visible in Utilities tracker.",
    tone: "green",
    meta: "Utilities"
  }
];

export const tasksNeedingCompletionQueue: CommandQueueItem[] = adminTaskRows
  .filter((task) => task.status.toLowerCase() !== "complete" && ["Critical", "High"].includes(task.priority))
  .slice(0, 8)
  .map((task) => ({
    id: `completion-${task.id}`,
    title: task.task,
    detail: `Status: ${task.status}`,
    tone: task.priority === "Critical" ? "red" : "yellow",
    meta: `${task.priority} / due ${task.due}`
  }));

export const proofNeededQueue: CommandQueueItem[] = [
  {
    id: "proof-1",
    title: "MBFS payment posting proof",
    detail: "Save confirmation only after lender portal or lender response proves payments posted.",
    tone: "red",
    meta: "Mortgage proof"
  },
  {
    id: "proof-2",
    title: "Marc Gosselin ledger conflict proof",
    detail: "Verify RentRedi/overdue summary conflict before any notice/legal decision.",
    tone: "yellow",
    meta: "Ledger proof"
  },
  {
    id: "proof-3",
    title: "Unit 6 maintenance communication proof",
    detail: "Keep the RentRedi Gmail alert reference visible until owner verifies the follow-up trail.",
    tone: "red",
    meta: "Maintenance proof"
  }
];

export const blockedUntilVerifiedQueue: CommandQueueItem[] = [
  {
    id: "blocked-1",
    title: "Eviction packet action",
    detail: "Blocked until ledger, proof of service, payment arrangement, and owner legal review are verified.",
    tone: "red",
    meta: "Legal safety"
  },
  {
    id: "blocked-2",
    title: "Mortgage arrears status",
    detail: "Blocked until MBFS posts both payment requests and provides updated balance.",
    tone: "red",
    meta: "Mortgage"
  },
  {
    id: "blocked-3",
    title: "UPMC May rent status",
    detail: "Blocked until owner verifies whether Alexandrea McCurdy May rent was received outside RentRedi.",
    tone: "yellow",
    meta: "Rent verification"
  }
];

export const ownerApprovalQueue: CommandQueueItem[] = [
  {
    id: "approval-1",
    title: "Approve mortgage follow-up package",
    detail: "Owner review required before any external lender communication or filing.",
    tone: "red",
    meta: "Approval required"
  },
  {
    id: "approval-2",
    title: "Approve maintenance follow-up path",
    detail: "Owner review required before any tenant/vendor response is sent outside the dashboard.",
    tone: "red",
    meta: "Safety-sensitive"
  },
  {
    id: "approval-3",
    title: "Approve weekly command review",
    detail: "Local draft can be reviewed before any future export or Drive save.",
    tone: "yellow",
    meta: "Draft only"
  }
];

export const communicationFollowUpQueue: CommandQueueItem[] = followUpRows
  .filter((row) => row.emailNeeded !== "No Email")
  .slice(0, 6)
  .map((row) => ({
    id: `communication-${row.id}`,
    title: row.item,
    detail: row.detail,
    tone: row.category === "Maintenance" ? "red" : "yellow",
    meta: `${row.property} ${row.unit}`
  }));

export const calendarSuspenseQueue: CommandQueueItem[] = followUpRows
  .filter((row) => row.calendarNeeded === "Calendar Needed")
  .slice(0, 8)
  .map((row) => ({
    id: `calendar-${row.id}`,
    title: row.item,
    detail: row.detail,
    tone: row.category === "Maintenance" || row.category === "Mortgage" ? "red" : "yellow",
    meta: `${row.date} ${row.time}`
  }));

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
