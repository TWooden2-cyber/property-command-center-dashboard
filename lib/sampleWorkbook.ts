import { SOURCE_TABS, type DashboardRangeKey, type DashboardRawBlock, type RawSheetRow, type RawSheetTab, type SourceTabName, type WorkbookSnapshot } from "@/types/sheets";

function tab(tabName: SourceTabName, rows: RawSheetRow[]): RawSheetTab {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return {
    tab: tabName,
    ok: true,
    empty: rows.length === 0,
    headers,
    rows
  };
}

function block(key: DashboardRangeKey, title: string, range: string, values: string[][]): DashboardRawBlock {
  return {
    key,
    title,
    range,
    ok: true,
    empty: values.length === 0,
    values
  };
}

const tabs = SOURCE_TABS.reduce<Record<SourceTabName, RawSheetTab>>((acc, tabName) => {
  acc[tabName] = tab(tabName, []);
  return acc;
}, {} as Record<SourceTabName, RawSheetTab>);

tabs["Dashboard"] = tab("Dashboard", [
  { Metric: "Net Cash Flow", Value: "3150" },
  { Metric: "Health", Value: "Green" }
]);

tabs["Rent Collection"] = tab("Rent Collection", [
  {
    Month: "May 2026",
    Property: "7-Unit",
    Unit: "Unit 1",
    Tenant: "Sample Tenant A",
    "Rent Due": "$1,250",
    "Amount Paid": "$1,250",
    Balance: "$0",
    "Due Date": "2026-05-01",
    "Date Paid": "2026-05-02",
    "Payment Method": "Sample ACH",
    "Late Fee": "$0"
  },
  {
    Month: "May 2026",
    Property: "4-Unit",
    Unit: "Unit B",
    Tenant: "Sample Tenant B",
    "Rent Due": "$950",
    "Amount Paid": "$300",
    Balance: "$650",
    "Due Date": "2026-05-01",
    "Date Paid": "2026-05-05",
    "Payment Method": "Sample card",
    "Late Fee": "$25"
  }
]);

tabs["Maintenance"] = tab("Maintenance", [
  {
    "Date Reported": "2026-05-10",
    Property: "7-Unit",
    Unit: "Common Area",
    Tenant: "Sample Tenant",
    Issue: "Hallway light fixture repair",
    Category: "Electrical",
    "Assigned Vendor": "Sample Vendor",
    "Estimated Cost": "$175",
    "Actual Cost": "$0",
    Status: "Open",
    Notes: "Sample maintenance item for local dashboard review."
  }
]);

tabs["Notices & Evictions"] = tab("Notices & Evictions", [
  {
    "Date Started": "2026-05-07",
    Property: "4-Unit",
    Unit: "Unit B",
    Tenant: "Sample Tenant B",
    "Notice Type": "Owner review sample",
    "Amount Owed": "$650",
    "Notice Date": "2026-05-07",
    "Deadline Date": "2026-05-17",
    "Delivery Method": "Local sample only",
    "Proof Saved": "No",
    "Court/Filing Status": "Not filed",
    Resolution: "",
    Notes: "Local-only sample. No notices are sent and no filings are prepared.",
    "Case Stage": "Owner Review Required",
    "Next Owner Action": "Review sample balance and proof status."
  }
]);

tabs["Mortgage & Allotments"] = tab("Mortgage & Allotments", [
  {
    Property: "7-Unit",
    "Mortgage Due Monthly": "$2,000",
    "Payment Source": "Owner operating account",
    "Allotment Status": "Active",
    "Current Arrears": "$0",
    "Payoff Plan": "Current",
    "Due Date": "2026-05-15",
    "Last Paid Date": "2026-05-15",
    "Confirmation Saved": "Yes",
    Notes: "Sample mortgage row."
  }
]);

tabs["Admin Task Log"] = tab("Admin Task Log", [
  {
    "Date Created": "2026-05-12",
    "Task Area": "Operations",
    Property: "Portfolio",
    Unit: "",
    Task: "Review local dashboard reset",
    Priority: "High",
    Owner: "Owner",
    "Due Date": "2026-05-22",
    Status: "Open",
    "Email Needed": "No",
    "Calendar Needed": "No",
    "Drive Link": "",
    Notes: "Sample task confirms local-only mode is visible."
  }
]);

tabs["Calendar & Follow-Ups"] = tab("Calendar & Follow-Ups", [
  {
    Date: "2026-05-22",
    Time: "10:00 AM",
    Property: "Portfolio",
    Unit: "",
    Tenant: "",
    Item: "Local dashboard review",
    Category: "Admin",
    Status: "Open",
    Notes: "Sample follow-up."
  }
]);

tabs["Cash Flow Summary"] = tab("Cash Flow Summary", [{ Metric: "Net Cash Flow", Value: "$3,150" }]);
tabs["Arrears Payoff Tracker"] = tab("Arrears Payoff Tracker", [{ Property: "4-Unit", "Current Arrears": "$650", "Payoff Plan": "Sample payment plan", "Due Date": "2026-05-22", Notes: "Sample arrears row." }]);
tabs["Utilities"] = tab("Utilities", [
  {
    Month: "May 2026",
    Property: "7-Unit",
    "Unit / Common Area": "Common Area",
    "Utility Type": "Electric",
    Provider: "Sample Utility Co.",
    "Usage Amount": "875",
    "Usage Unit": "kWh",
    "Total Cost": "$215",
    "Cost Per Unit": "$0.25",
    "Due Date": "2026-05-24",
    "Date Paid": "",
    "Payment Status": "Needs Entry",
    "Usage Spike?": "No",
    "Review Status": "Needs Review",
    Notes: "Local sample utility bill."
  },
  {
    Month: "May 2026",
    Property: "4-Unit",
    "Unit / Common Area": "Common Area",
    "Utility Type": "Water / Sewer",
    Provider: "Sample Water Authority",
    "Usage Amount": "12000",
    "Usage Unit": "Gallons",
    "Total Cost": "$188",
    "Cost Per Unit": "$0.02",
    "Due Date": "2026-05-26",
    "Payment Status": "Paid",
    "Usage Spike?": "Yes",
    "Review Status": "Needs Review",
    Notes: "Sample usage spike alert."
  }
]);

export const sampleWorkbookSnapshot: WorkbookSnapshot = {
  tabs,
  dashboardBlocks: {
    summary: block("summary", "Executive Summary", "Local!A1:I2", [
      ["Dashboard ID", "Generated Date", "Dashboard Status", "Overall Health Rating", "Total Tracker Items", "Open Items", "Closed Items", "Overdue Items", "Emergency Items"],
      ["LOCAL-RESET", "2026-05-21", "Local sample mode", "Green", "8", "4", "4", "1", "0"]
    ]),
    metrics: block("metrics", "Metrics", "Local!A1:B4", [
      ["Metric", "Value"],
      ["Health", "Green"],
      ["Open", "4"],
      ["Owner Decision Required", "2"]
    ]),
    liveTrackers: block("liveTrackers", "Live Trackers", "Local!A1:J2", [
      ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Google Task ID", "Calendar Event ID", "Communication Ledger ID", "Google Drive Intake Row"],
      ["LOCAL-001", "Open", "High", "Yes", "Review", "2026-05-22", "", "", "", ""]
    ]),
    ownerDecisions: block("ownerDecisions", "Owner Decisions", "Local!A1:J2", [
      ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Safe Category Label", "Safe Action Label", "Approval Gate", "Review Status"],
      ["LOCAL-002", "Open", "High", "Yes", "Owner review", "2026-05-22", "Operations", "Review local sample dashboard", "Owner approval only", "Needs Review"]
    ]),
    urgentActions: block("urgentActions", "Urgent Actions", "Local!A1:H2", [
      ["Tracker ID", "Urgency", "Priority", "Emergency Flag", "Overdue Flag", "Safe Action Label", "Approval Required", "Review Status"],
      ["LOCAL-003", "Today", "High", "No", "Yes", "Review overdue sample item", "Yes", "Needs Review"]
    ]),
    maintenance: block("maintenance", "Maintenance Queue", "Local!A1:J2", [
      ["Tracker ID", "Status", "Priority", "Owner Decision Required", "Workflow Stage", "Follow-Up Date", "Google Task ID", "Calendar Event ID", "Communication Ledger ID", "Google Drive Intake Row"],
      ["LOCAL-004", "Open", "Normal", "No", "Vendor follow-up", "2026-05-23", "", "", "", ""]
    ]),
    googleDriveIntake: block("googleDriveIntake", "Google Drive Intake", "Local!A1:F2", [
      ["Row", "Source Type", "Tracker ID", "Review Status", "Proof Status Label", "Safe Action Label"],
      ["1", "Local sample", "LOCAL-005", "Complete", "Sample only", "No Drive connection"]
    ]),
    gmailIntake: block("gmailIntake", "Gmail Intake", "Local!A1:G2", [
      ["Message ID", "Thread ID", "Source Type", "Tracker ID", "Review Status", "Safe Category Label", "Safe Action Label"],
      ["local-message", "local-thread", "Local sample", "LOCAL-006", "Complete", "No Gmail connection", "No email action"]
    ]),
    calendarFollowUps: block("calendarFollowUps", "Calendar Follow-Ups", "Local!A1:G2", [
      ["Tracker ID", "Follow-Up Date", "Calendar Event ID", "Google Task ID", "Status", "Safe Follow-Up Label", "Approval Gate"],
      ["LOCAL-007", "2026-05-22", "", "", "Open", "Review local follow-up", "No live calendar connection"]
    ])
  },
  system: {
    connectionOk: true,
    connectionMessage: "Local sample data mode. Live Google APIs are disabled.",
    lastSuccessfulRefresh: "2026-05-21T00:00:00.000Z",
    dataMode: "sample",
    requestedDataMode: "sample",
    liveSheetsConfigured: false,
    liveSourceChecklist: [],
    tabsDetected: [...SOURCE_TABS],
    missingTabs: [],
    env: {
      googleSheetsSpreadsheetId: false,
      googleSheetsClientEmail: false,
      googleSheetsPrivateKey: false,
      dashboardOwnerPassword: false,
      dashboardSessionSecret: false
    }
  }
};
