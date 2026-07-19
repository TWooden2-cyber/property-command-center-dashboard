export const SOURCE_TABS = [
  "Dashboard",
  "Rent Collection",
  "Maintenance",
  "Lease Violations",
  "Notices & Evictions",
  "Mortgage & Allotments",
  "Admin Task Log",
  "Calendar & Follow-Ups",
  "Cash Flow Summary",
  "Payment Arrangements",
  "Arrears Payoff Tracker",
  "Property Manager Reports",
  "Expense Import Summary",
  "Section 8 HAP Payments",
  "Utilities"
] as const;

export type SourceTabName = (typeof SOURCE_TABS)[number];

export type RiskLevel = "Stable" | "Normal" | "Watch" | "High" | "Critical";
export type DashboardDataMode = "sample" | "live";

export type EnvStatus = {
  dashboardDataMode: boolean;
  googleSheetsSpreadsheetId: boolean;
  googleSheetsClientEmail: boolean;
  googleSheetsPrivateKey: boolean;
  usingAliasSpreadsheetId: boolean;
  usingAliasClientEmail: boolean;
  usingAliasPrivateKey: boolean;
  dashboardOwnerPassword: boolean;
  dashboardSessionSecret: boolean;
};

export type LiveDiagnostics = {
  requestedDataMode: DashboardDataMode;
  resolvedDataMode: DashboardDataMode;
  liveConfigured: boolean;
  liveAttempted: boolean;
  source: "local-sample" | "google-sheets-readonly";
  setupErrors: string[];
  envDetected: EnvStatus;
};

export type LiveOperationServiceKey = "sheets" | "gmail" | "calendar" | "tasks" | "drive";

export type LiveOperationServiceStatus = {
  key: LiveOperationServiceKey;
  label: string;
  enabled: boolean;
  blocked: boolean;
  missing: string[];
  allowedActions: string[];
  forbiddenActions: string[];
};

export type LiveOperationsStatus = {
  liveOperationsEnabled: boolean;
  dryRunRequired: boolean;
  ownerApprovalRequired: boolean;
  auditLoggingEnabled: boolean;
  auditTab: string;
  services: Record<LiveOperationServiceKey, LiveOperationServiceStatus>;
};

export type LiveSourceTabStatus = {
  tab: string;
  present: boolean;
  rowCount: number;
  requiredColumns: string[];
  presentColumns: string[];
  missingColumns: string[];
};

export type AuthStatus = {
  authenticated: boolean;
  approved: boolean;
  email?: string | null;
  method?: "owner-password";
  accessControlEnabled?: boolean;
};

export type SystemStatus = {
  connectionOk: boolean;
  connectionMessage: string;
  lastSuccessfulRefresh: string | null;
  dataMode: DashboardDataMode;
  requestedDataMode: DashboardDataMode;
  resolvedDataMode: DashboardDataMode;
  liveSheetsConfigured: boolean;
  liveAttempted: boolean;
  source: "local-sample" | "google-sheets-readonly";
  setupErrors: string[];
  liveSourceChecklist: LiveSourceTabStatus[];
  tabsDetected: string[];
  missingTabs: string[];
  env: EnvStatus;
  auth: AuthStatus;
  liveOperations: LiveOperationsStatus;
};

export type RawSheetRow = Record<string, string>;

export type RawSheetTab = {
  tab: SourceTabName;
  ok: boolean;
  empty: boolean;
  headers: string[];
  rows: RawSheetRow[];
  warning?: string;
  error?: string;
};

export type DashboardRangeKey =
  | "summary"
  | "metrics"
  | "liveTrackers"
  | "ownerDecisions"
  | "urgentActions"
  | "maintenance"
  | "googleDriveIntake"
  | "gmailIntake"
  | "calendarFollowUps";

export type DashboardRawBlock = {
  key: DashboardRangeKey;
  title: string;
  range: string;
  ok: boolean;
  empty: boolean;
  values: string[][];
  warning?: string;
  error?: string;
};

export type DashboardBlockRow = {
  id: string;
  cells: string[];
  values: Record<string, string>;
};

export type DashboardBlock = {
  key: DashboardRangeKey;
  title: string;
  range: string;
  headers: string[];
  rows: DashboardBlockRow[];
  ok: boolean;
  empty: boolean;
  warning?: string;
  error?: string;
};

export type WorkbookSnapshot = {
  tabs: Record<SourceTabName, RawSheetTab>;
  dashboardBlocks: Record<DashboardRangeKey, DashboardRawBlock>;
  system: Omit<SystemStatus, "auth" | "liveOperations">;
};

export type KpiMetric = {
  label: string;
  value: string;
  helper?: string;
  tone?: RiskLevel;
};

export type RiskItem = {
  label: string;
  level: RiskLevel;
  summary: string;
};

export type OverviewData = {
  kpis: KpiMetric[];
  ownerDecision: string;
  risks: RiskItem[];
  warnings: string[];
};

export type RentStatus = "Paid" | "Partial" | "Unpaid" | "Needs Follow-Up";

export type RentRecord = {
  id: string;
  month: string;
  property: string;
  unit: string;
  tenant: string;
  rentDue: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  datePaid: string;
  paymentMethod: string;
  lateFee: number;
  status: RentStatus;
  nextAction: string;
};

export type NoticeCaseStage =
  | "Payment Arrangement Active"
  | "Proof Missing"
  | "Deadline Approaching"
  | "Deadline Expired"
  | "Notice Served / Countdown Active"
  | "Prepare Filing Packet"
  | "Resolved"
  | "Owner Review Required";

export type NoticeRecord = {
  id: string;
  dateStarted: string;
  property: string;
  unit: string;
  tenant: string;
  noticeType: string;
  amountOwed: number;
  noticeDate: string;
  deadlineDate: string;
  deliveryMethod: string;
  proofSaved: string;
  courtFilingStatus: string;
  resolution: string;
  notes: string;
  mailingPrepDate: string;
  mailingPrepTime: string;
  mailFilingMethod: string;
  mailingStatus: string;
  trackingReceipt: string;
  mailingNotes: string;
  caseStage: NoticeCaseStage;
  nextOwnerAction: string;
};

export type MaintenancePriority = "Emergency" | "High" | "Normal";

export type MaintenanceRecord = {
  id: string;
  dateReported: string;
  property: string;
  unit: string;
  tenant: string;
  issue: string;
  category: string;
  priority: MaintenancePriority;
  assignedVendor: string;
  estimatedCost: number;
  actualCost: number;
  status: string;
  dateCompleted: string;
  tenantUpdateSent: string;
  photosReceiptsLink: string;
  rentRediRequestLink: string;
  gmailMessageId: string;
  notes: string;
};

export type MortgageRisk = "Critical" | "Stable" | "Watch";

export type MortgageArrearsRecord = {
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
  risk: MortgageRisk;
};

export type AdminTaskPriority = "Critical" | "High" | "Normal" | "Low";
export type AdminTaskStatus = "Open" | "Complete" | "Waiting" | "Owner Review";

export type AdminTaskRecord = {
  id: string;
  dateCreated: string;
  taskArea: string;
  property: string;
  unit: string;
  task: string;
  priority: AdminTaskPriority;
  owner: string;
  dueDate: string;
  status: AdminTaskStatus;
  emailNeeded: string;
  calendarNeeded: string;
  driveLink: string;
  completedDate: string;
  notes: string;
};

export type CalendarFollowUpRecord = {
  id: string;
  date: string;
  time: string;
  property: string;
  unit: string;
  tenant: string;
  item: string;
  category: string;
  status: string;
  notes: string;
  group: "Today" | "This Week" | "Later" | "Overdue";
};

export type UtilityRecord = {
  id: string;
  month: string;
  monthKey: string;
  monthLabel: string;
  year: string;
  property: string;
  unitCommonArea: string;
  utilityType: string;
  provider: string;
  accountNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  usageAmount: number;
  usageUnit: string;
  totalCost: number;
  costPerUnit: number;
  dueDate: string;
  datePaid: string;
  paymentStatus: string;
  billReceiptLink: string;
  usageSpike: boolean;
  reviewStatus: string;
  notes: string;
  dashboardInclude: string;
};

export type CommandCenterData = {
  overview: OverviewData;
  dashboardBlocks: Record<DashboardRangeKey, DashboardBlock>;
  rentCollection: RentRecord[];
  noticesEvictions: NoticeRecord[];
  maintenance: MaintenanceRecord[];
  mortgageArrears: MortgageArrearsRecord[];
  adminTasks: AdminTaskRecord[];
  calendarFollowUps: Record<CalendarFollowUpRecord["group"], CalendarFollowUpRecord[]>;
  utilities: UtilityRecord[];
  system: Omit<SystemStatus, "auth" | "liveOperations">;
};

export type SheetsView =
  | "overview"
  | "owner-approvals"
  | "rent-collection"
  | "notices-evictions"
  | "maintenance"
  | "mortgage-arrears"
  | "admin-tasks"
  | "calendar-follow-ups"
  | "utilities"
  | "settings";
