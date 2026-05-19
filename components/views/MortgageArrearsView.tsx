"use client";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { MortgageArrearsRecord } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type MortgagePayload = {
  rows: MortgageArrearsRecord[];
};

const columns: DataTableColumn<MortgageArrearsRecord>[] = [
  { key: "property", header: "Property", render: (row) => row.property || "Not set" },
  { key: "mortgageDueMonthly", header: "Mortgage Due Monthly", render: (row) => formatCurrency(row.mortgageDueMonthly), className: "numeric" },
  { key: "paymentSource", header: "Payment Source", render: (row) => row.paymentSource || "Not set" },
  { key: "allotmentStatus", header: "Allotment Status", render: (row) => <StatusBadge label={row.allotmentStatus || "Not set"} /> },
  { key: "currentArrears", header: "Current Arrears", render: (row) => formatCurrency(row.currentArrears), className: "numeric" },
  { key: "payoffPlan", header: "Payoff Plan", render: (row) => row.payoffPlan || "Not set" },
  { key: "dueDate", header: "Due Date", render: (row) => formatDate(row.dueDate) },
  { key: "lastPaidDate", header: "Last Paid Date", render: (row) => formatDate(row.lastPaidDate) },
  { key: "confirmationSaved", header: "Confirmation Saved", render: (row) => row.confirmationSaved || "Not set" },
  { key: "risk", header: "Risk", render: (row) => <StatusBadge label={row.risk} /> },
  { key: "notes", header: "Notes", render: (row) => row.notes || "None" }
];

export function MortgageArrearsView() {
  const { data, error, loading } = useSheetsView<MortgagePayload>("mortgage-arrears");

  if (loading) {
    return <LoadingState label="Loading mortgage and arrears..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.rows.length) {
    return <EmptyState title="No mortgage or arrears records" message="The related tabs are empty or have not been connected yet." />;
  }

  return <DataTable rows={data.rows} columns={columns} />;
}
