"use client";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { DashboardBlockTable } from "@/components/DashboardBlockTable";
import { SheetsRefreshStatus } from "@/components/SheetsRefreshStatus";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { DashboardBlock, MaintenanceRecord } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type MaintenancePayload = {
  rows: MaintenanceRecord[];
  dashboardBlock?: DashboardBlock;
};

function ExternalValue({ value }: { value: string }) {
  if (!value) {
    return <>Not set</>;
  }

  if (value.startsWith("http")) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="table-link">
        Open link
      </a>
    );
  }

  return <>{value}</>;
}

const columns: DataTableColumn<MaintenanceRecord>[] = [
  { key: "dateReported", header: "Date Reported", render: (row) => formatDate(row.dateReported) },
  { key: "property", header: "Property", render: (row) => row.property || "Not set" },
  { key: "unit", header: "Unit", render: (row) => row.unit || "Not set" },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant || "Not set" },
  { key: "issue", header: "Issue", render: (row) => row.issue || "Not set" },
  { key: "category", header: "Category", render: (row) => row.category || "Not set" },
  { key: "priority", header: "Priority", render: (row) => <StatusBadge label={row.priority} /> },
  { key: "assignedVendor", header: "Assigned Vendor", render: (row) => row.assignedVendor || "Not assigned" },
  { key: "estimatedCost", header: "Estimated Cost", render: (row) => formatCurrency(row.estimatedCost), className: "numeric" },
  { key: "actualCost", header: "Actual Cost", render: (row) => formatCurrency(row.actualCost), className: "numeric" },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status || "Open"} /> },
  { key: "dateCompleted", header: "Date Completed", render: (row) => formatDate(row.dateCompleted) },
  { key: "tenantUpdateSent", header: "Tenant Update Sent", render: (row) => row.tenantUpdateSent || "Not set" },
  { key: "photosReceiptsLink", header: "Photos/Receipts Link", render: (row) => <ExternalValue value={row.photosReceiptsLink} /> },
  { key: "rentRediRequestLink", header: "RentRedi Request Link", render: (row) => <ExternalValue value={row.rentRediRequestLink} /> },
  { key: "gmailMessageId", header: "Gmail Message ID", render: (row) => row.gmailMessageId || "Not set" },
  { key: "notes", header: "Notes", render: (row) => row.notes || "None" }
];

export function MaintenanceView() {
  const { data, system, error, loading } = useSheetsView<MaintenancePayload>("maintenance");

  if (loading) {
    return <LoadingState label="Loading maintenance tracker..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.rows.length && !data?.dashboardBlock?.rows.length) {
    return <EmptyState title="No maintenance records" message="The Maintenance tab and Dashboard maintenance range are empty or not connected yet." />;
  }

  return (
    <div className="view-stack">
      <SheetsRefreshStatus system={system} />
      <DashboardBlockTable block={data.dashboardBlock} />
      {data.dashboardBlock?.rows.length ? null : data.rows.length ? <DataTable rows={data.rows} columns={columns} /> : null}
    </div>
  );
}
