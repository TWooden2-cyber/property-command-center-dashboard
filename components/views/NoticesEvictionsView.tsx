"use client";

import { ClipboardCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { NoticeRecord } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type NoticesPayload = {
  rows: NoticeRecord[];
};

const filingChecklist = [
  "Lease",
  "Tenant ledger",
  "Notice to Quit",
  "Proof of service",
  "RentRedi balance",
  "Payment history",
  "Communication history",
  "Court filing information",
  "Owner approval"
];

const columns: DataTableColumn<NoticeRecord>[] = [
  { key: "dateStarted", header: "Date Started", render: (row) => formatDate(row.dateStarted) },
  { key: "property", header: "Property", render: (row) => row.property || "Not set" },
  { key: "unit", header: "Unit", render: (row) => row.unit || "Not set" },
  { key: "tenant", header: "Tenant", render: (row) => row.tenant || "Not set" },
  { key: "noticeType", header: "Notice Type", render: (row) => row.noticeType || "Not set" },
  { key: "amountOwed", header: "Amount Owed", render: (row) => formatCurrency(row.amountOwed), className: "numeric" },
  { key: "noticeDate", header: "Notice Date", render: (row) => formatDate(row.noticeDate) },
  { key: "deadlineDate", header: "Deadline Date", render: (row) => formatDate(row.deadlineDate) },
  { key: "deliveryMethod", header: "Delivery Method", render: (row) => row.deliveryMethod || "Not set" },
  { key: "proofSaved", header: "Proof Saved", render: (row) => row.proofSaved || "No" },
  { key: "courtFilingStatus", header: "Court/Filing Status", render: (row) => row.courtFilingStatus || "Not set" },
  { key: "resolution", header: "Resolution", render: (row) => row.resolution || "Open" },
  { key: "mailingPrepDate", header: "Mailing Prep Date", render: (row) => formatDate(row.mailingPrepDate) },
  { key: "mailingPrepTime", header: "Mailing Prep Time", render: (row) => row.mailingPrepTime || "Not set" },
  { key: "mailFilingMethod", header: "Mail / Filing Method", render: (row) => row.mailFilingMethod || "Not set" },
  { key: "mailingStatus", header: "Mailing Status", render: (row) => row.mailingStatus || "Not set" },
  { key: "trackingReceipt", header: "Tracking / Receipt", render: (row) => row.trackingReceipt || "Not set" },
  { key: "caseStage", header: "Case Stage", render: (row) => <StatusBadge label={row.caseStage} /> },
  { key: "nextOwnerAction", header: "Next Owner Action", render: (row) => row.nextOwnerAction },
  { key: "notes", header: "Notes", render: (row) => row.notes || row.mailingNotes || "None" }
];

export function NoticesEvictionsView() {
  const { data, error, loading } = useSheetsView<NoticesPayload>("notices-evictions");

  if (loading) {
    return <LoadingState label="Loading notice and eviction tracker..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.rows.length) {
    return <EmptyState title="No notice records" message="The Notices & Evictions tab is empty or has not been connected yet." />;
  }

  return (
    <div className="view-stack">
      <section className="safety-panel">
        <p className="eyebrow">Legal safety</p>
        <p>
          This page tracks deadlines, proof, payment arrangements, and owner review. It does not file cases, send notices,
          threaten tenants, or communicate with tenants.
        </p>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Filing packet checklist</p>
            <h2>Owner approval materials</h2>
          </div>
        </div>
        <div className="checklist-grid">
          {filingChecklist.map((item) => (
            <span key={item}>
              <ClipboardCheck size={16} aria-hidden />
              {item}
            </span>
          ))}
        </div>
      </section>

      <DataTable rows={data.rows} columns={columns} />
    </div>
  );
}
