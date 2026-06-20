"use client";

import { ClipboardList } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useSheetsView } from "@/components/views/useSheetsView";
import type { LiveSourceTabStatus, SystemStatus } from "@/types/sheets";

type SettingsPayload = {
  system: SystemStatus;
};

type LiveSourceRow = LiveSourceTabStatus & {
  id: string;
};

const columns: DataTableColumn<LiveSourceRow>[] = [
  { key: "tab", header: "Required Tab", render: (row) => row.tab },
  { key: "present", header: "Status", render: (row) => <StatusBadge label={row.present && row.missingColumns.length === 0 ? "Ready" : row.present ? "Columns Missing" : "Tab Missing"} /> },
  { key: "rowCount", header: "Rows", render: (row) => String(row.rowCount), className: "numeric" },
  { key: "missingColumns", header: "Missing Columns", render: (row) => row.missingColumns.length ? row.missingColumns.join(", ") : "None" },
  { key: "requiredColumns", header: "Required Columns", render: (row) => row.requiredColumns.join(", ") }
];

export function LiveSourceChecklistPanel() {
  const { data, error, loading } = useSheetsView<SettingsPayload>("settings");

  if (loading) {
    return <LoadingState label="Checking live source workbook..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.system) {
    return <EmptyState title="No live source status" message="Workbook source status is unavailable." />;
  }

  const { system } = data;
  const issueCount = system.liveSourceChecklist.filter((item) => !item.present || item.missingColumns.length > 0).length;
  const modeLabel = system.dataMode === "live" ? "Live Google Sheets" : "Live data unavailable";
  const rows = system.liveSourceChecklist.map((item) => ({ ...item, id: item.tab }));

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live Source Checklist</p>
          <h2>Google Sheets workbook readiness</h2>
        </div>
        <ClipboardList size={20} aria-hidden />
      </div>
      <div className="settings-lines">
        <div className="mode-status-list">
          <span>Data Mode: <strong>{modeLabel}</strong></span>
          <StatusBadge label={modeLabel} />
        </div>
        <div className="mode-status-list">
          <span>Live Sheets Configured: <strong>{system.liveSheetsConfigured ? "Yes" : "No"}</strong></span>
          <StatusBadge label={system.liveSheetsConfigured ? "Configured" : "Missing"} />
        </div>
        <div className="mode-status-list">
          <span>Workbook Issues: <strong>{issueCount}</strong></span>
          <StatusBadge label={issueCount ? "Needs Review" : "Ready"} />
        </div>
        <p className="muted-line">Missing tabs or columns are visible only after owner login. Production does not display sample data when live Sheets is not configured.</p>
      </div>
      {system.liveSourceChecklist.length ? (
        <DataTable rows={rows} columns={columns} />
      ) : (
        <EmptyState title="Live source checklist unavailable" message="Configure live Sheets variables to validate tabs and columns." />
      )}
      <div className="setup-guide-box">
        <h3>Owner setup guide</h3>
        <ol>
          <li>Create a private Google Sheet.</li>
          <li>Create the 13 tabs listed above with the exact names shown.</li>
          <li>Add the required columns in row 1 for each tab.</li>
          <li>Share the Sheet with the service account email from GOOGLE_SHEETS_CLIENT_EMAIL as Viewer only.</li>
          <li>Add Vercel variables: DASHBOARD_DATA_MODE=live, GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY.</li>
          <li>Redeploy Vercel after adding environment variables.</li>
          <li>Refresh the dashboard to pull the latest Google Sheets data.</li>
        </ol>
      </div>
    </section>
  );
}
