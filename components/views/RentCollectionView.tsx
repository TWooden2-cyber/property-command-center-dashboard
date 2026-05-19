"use client";

import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { RentRecord } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type RentPayload = {
  rows: RentRecord[];
};

const columns: DataTableColumn<RentRecord>[] = [
  { key: "month", header: "Month", render: (row) => row.month || "Not set" },
  { key: "property", header: "Property", render: (row) => row.property || "Not set" },
  { key: "unit", header: "Unit", render: (row) => row.unit || "Not set" },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant || "Not set" },
  { key: "rentDue", header: "Rent Due", render: (row) => formatCurrency(row.rentDue), className: "numeric" },
  { key: "amountPaid", header: "Amount Paid", render: (row) => formatCurrency(row.amountPaid), className: "numeric" },
  { key: "balance", header: "Balance", render: (row) => formatCurrency(row.balance), className: "numeric" },
  { key: "dueDate", header: "Due Date", render: (row) => formatDate(row.dueDate) },
  { key: "datePaid", header: "Date Paid", render: (row) => formatDate(row.datePaid) },
  { key: "paymentMethod", header: "Payment Method", render: (row) => row.paymentMethod || "Not set" },
  { key: "lateFee", header: "Late Fee", render: (row) => formatCurrency(row.lateFee), className: "numeric" },
  { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
  { key: "nextAction", header: "Next Action", render: (row) => row.nextAction }
];

export function RentCollectionView() {
  const { data, error, loading } = useSheetsView<RentPayload>("rent-collection");

  if (loading) {
    return <LoadingState label="Loading rent collection..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.rows.length) {
    return <EmptyState title="No rent records" message="The Rent Collection tab is empty or has not been connected yet." />;
  }

  return <DataTable rows={data.rows} columns={columns} />;
}
