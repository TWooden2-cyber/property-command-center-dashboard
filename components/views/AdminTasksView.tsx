"use client";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/formatters";
import type { AdminTaskRecord } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type AdminPayload = {
  rows: AdminTaskRecord[];
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

const columns: DataTableColumn<AdminTaskRecord>[] = [
  { key: "dateCreated", header: "Date Created", render: (row) => formatDate(row.dateCreated) },
  { key: "taskArea", header: "Task Area", render: (row) => row.taskArea || "General" },
  { key: "property", header: "Property", render: (row) => row.property || "Not set" },
  { key: "unit", header: "Unit", render: (row) => row.unit || "Not set" },
  { key: "task", header: "Task", render: (row) => row.task || "Not set" },
  { key: "priority", header: "Priority", render: (row) => <StatusBadge label={row.priority} /> },
  { key: "owner", header: "Owner", render: (row) => row.owner || "Not set" },
  { key: "dueDate", header: "Due Date", render: (row) => formatDate(row.dueDate) },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "emailNeeded", header: "Email Needed", render: (row) => row.emailNeeded || "No" },
  { key: "calendarNeeded", header: "Calendar Needed", render: (row) => row.calendarNeeded || "No" },
  { key: "driveLink", header: "Drive Link", render: (row) => <ExternalValue value={row.driveLink} /> },
  { key: "completedDate", header: "Completed Date", render: (row) => formatDate(row.completedDate) },
  { key: "notes", header: "Notes", render: (row) => row.notes || "None" }
];

export function AdminTasksView() {
  const { data, error, loading } = useSheetsView<AdminPayload>("admin-tasks");

  if (loading) {
    return <LoadingState label="Loading admin task log..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.rows.length) {
    return <EmptyState title="No admin tasks" message="The Admin Task Log tab is empty or has not been connected yet." />;
  }

  return <DataTable rows={data.rows} columns={columns} />;
}
