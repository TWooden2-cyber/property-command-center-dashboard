"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Copy } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
import type {
  CalendarFollowUpRecord,
  DashboardBlock,
  MaintenanceRecord,
  MortgageArrearsRecord,
  NoticeRecord,
  RentRecord,
  SystemStatus,
  UtilityRecord
} from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type OverviewPayload = {
  dashboardBlocks: {
    ownerDecisions: DashboardBlock;
    urgentActions: DashboardBlock;
    liveTrackers: DashboardBlock;
  };
};

type RowsPayload<T> = {
  rows: T[];
};

type CalendarPayload = {
  groups: Record<CalendarFollowUpRecord["group"], CalendarFollowUpRecord[]>;
};

type QueueItem = {
  id: string;
  status: string;
  nextAction: string;
  ownerDecisionRequired: string;
  command: string;
};

type QueuePanel = {
  title: string;
  source: string;
  items: QueueItem[];
};

function commandFor(title: string, item: string, action: string) {
  return `Review ${title}.

Item:
${item}

Rules:
- Read dashboard and Google Sheets data only.
- Do not send tenant, vendor, legal, payment, Gmail, Calendar, Drive, Sheets, or RentRedi actions.
- Produce an owner-review recommendation and stop before live writes.

Requested review:
${action}`;
}

function blockItems(title: string, block?: DashboardBlock, limit = 3): QueueItem[] {
  return (block?.rows ?? []).slice(0, limit).map((row) => {
    const label = row.values["Safe Action Label"] || row.values["Workflow Stage"] || row.values["Status"] || row.cells.filter(Boolean).join(" | ");
    const id = row.values["Tracker ID"] || row.values["Row"] || row.id;
    return {
      id,
      status: row.values["Status"] || row.values["Review Status"] || "Needs Review",
      nextAction: label || "Review dashboard row.",
      ownerDecisionRequired: row.values["Owner Decision Required"] || row.values["Approval Required"] || "Yes",
      command: commandFor(title, `${id}: ${label}`, label || "Review item and recommend the next owner decision.")
    };
  });
}

function queueFromRows<T>(
  title: string,
  rows: T[] | undefined,
  map: (row: T, index: number) => QueueItem,
  fallback: QueueItem
): QueueItem[] {
  const mapped = (rows ?? []).slice(0, 4).map(map);
  return mapped.length ? mapped : [fallback];
}

function emptyCommand(title: string, source: string): QueueItem {
  return {
    id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-empty`,
    status: "No active rows",
    nextAction: `No ${source} rows currently require owner action.`,
    ownerDecisionRequired: "No",
    command: commandFor(title, source, "Confirm no active rows require follow-up. Do not create live actions.")
  };
}

function useQueueData() {
  const overview = useSheetsView<OverviewPayload>("overview");
  const rent = useSheetsView<RowsPayload<RentRecord>>("rent-collection");
  const maintenance = useSheetsView<RowsPayload<MaintenanceRecord>>("maintenance");
  const mortgage = useSheetsView<RowsPayload<MortgageArrearsRecord>>("mortgage-arrears");
  const notices = useSheetsView<RowsPayload<NoticeRecord>>("notices-evictions");
  const utilities = useSheetsView<RowsPayload<UtilityRecord>>("utilities");
  const calendar = useSheetsView<CalendarPayload>("calendar-follow-ups");

  const loading = [overview, rent, maintenance, mortgage, notices, utilities, calendar].some((query) => query.loading);
  const error = [overview, rent, maintenance, mortgage, notices, utilities, calendar].map((query) => query.error).find(Boolean) ?? null;
  const system = overview.system;

  return { overview, rent, maintenance, mortgage, notices, utilities, calendar, loading, error, system };
}

export function OperationalAutomationPanels() {
  const { overview, rent, maintenance, mortgage, notices, utilities, calendar, loading, error, system } = useQueueData();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const sourceLabel = system?.dataMode === "live" ? "Live Google Sheets" : "Local Sample";
  const ownerDecisions = overview.data?.dashboardBlocks.ownerDecisions;
  const urgentActions = overview.data?.dashboardBlocks.urgentActions;
  const liveTrackers = overview.data?.dashboardBlocks.liveTrackers;

  const panels = useMemo<QueuePanel[]>(() => {
    const followUps = Object.values(calendar.data?.groups ?? {}).flat();
    return [
      {
        title: "Daily Command Review",
        source: "Overview / urgent actions",
        items: blockItems("Daily Command Review", urgentActions, 4)
      },
      {
        title: "Rent Collection Follow-Up Queue",
        source: "Rent Collection",
        items: queueFromRows(
          "Rent Collection Follow-Up Queue",
          rent.data?.rows.filter((row) => row.balance > 0 || row.status !== "Paid"),
          (row) => ({
            id: row.id,
            status: row.status,
            nextAction: row.nextAction,
            ownerDecisionRequired: row.balance > 0 ? "Yes" : "No",
            command: commandFor("Rent Collection Follow-Up Queue", `${row.property} ${row.unit} ${row.tenant} balance ${row.balance}`, row.nextAction)
          }),
          emptyCommand("Rent Collection Follow-Up Queue", "rent collection")
        )
      },
      {
        title: "Maintenance Follow-Up Queue",
        source: "Maintenance",
        items: queueFromRows(
          "Maintenance Follow-Up Queue",
          maintenance.data?.rows.filter((row) => !["complete", "completed", "closed", "resolved"].includes(row.status.toLowerCase())),
          (row) => ({
            id: row.id,
            status: row.status,
            nextAction: `${row.issue || "Maintenance item"} - verify vendor/proof status.`,
            ownerDecisionRequired: row.priority === "Emergency" || row.priority === "High" ? "Yes" : "Review",
            command: commandFor("Maintenance Follow-Up Queue", `${row.property} ${row.unit}: ${row.issue}`, "Verify status, proof needed, and next vendor follow-up.")
          }),
          emptyCommand("Maintenance Follow-Up Queue", "maintenance")
        )
      },
      {
        title: "Mortgage and Arrears Queue",
        source: "Mortgage and Arrears",
        items: queueFromRows(
          "Mortgage and Arrears Queue",
          mortgage.data?.rows.filter((row) => row.currentArrears > 0 || row.risk !== "Stable"),
          (row) => ({
            id: row.id,
            status: row.risk,
            nextAction: row.payoffPlan || row.notes || "Verify lender status and next follow-up.",
            ownerDecisionRequired: row.currentArrears > 0 ? "Yes" : "Review",
            command: commandFor("Mortgage and Arrears Queue", `${row.property}: arrears ${row.currentArrears}`, row.payoffPlan || "Review mortgage and arrears status.")
          }),
          emptyCommand("Mortgage and Arrears Queue", "mortgage and arrears")
        )
      },
      {
        title: "Notices and Legal Holds Queue",
        source: "Notices and Legal Holds",
        items: queueFromRows(
          "Notices and Legal Holds Queue",
          notices.data?.rows.filter((row) => row.caseStage !== "Resolved"),
          (row) => ({
            id: row.id,
            status: row.caseStage,
            nextAction: row.nextOwnerAction,
            ownerDecisionRequired: "Yes",
            command: commandFor("Notices and Legal Holds Queue", `${row.property} ${row.unit}: ${row.noticeType}`, row.nextOwnerAction)
          }),
          emptyCommand("Notices and Legal Holds Queue", "notices and legal holds")
        )
      },
      {
        title: "Utilities Risk Queue",
        source: "Utilities",
        items: queueFromRows(
          "Utilities Risk Queue",
          utilities.data?.rows.filter((row) => row.usageSpike || !["paid", "complete"].includes(row.paymentStatus.toLowerCase())),
          (row) => ({
            id: row.id,
            status: row.paymentStatus,
            nextAction: row.reviewStatus || row.notes || "Review due date, amount, and shutoff risk.",
            ownerDecisionRequired: row.usageSpike ? "Yes" : "Review",
            command: commandFor("Utilities Risk Queue", `${row.property} ${row.utilityType} ${row.provider}`, row.reviewStatus || "Review utility risk.")
          }),
          emptyCommand("Utilities Risk Queue", "utilities")
        )
      },
      {
        title: "Lease Violation Queue",
        source: "Lease Violations",
        items: blockItems("Lease Violation Queue", liveTrackers, 2).map((item) => ({
          ...item,
          nextAction: item.nextAction || "Review lease-related tracker rows."
        }))
      },
      {
        title: "Vendor Follow-Up Queue",
        source: "Vendor Communications / Maintenance",
        items: queueFromRows(
          "Vendor Follow-Up Queue",
          maintenance.data?.rows.filter((row) => row.assignedVendor && row.status.toLowerCase() !== "complete"),
          (row) => ({
            id: `${row.id}-vendor`,
            status: row.status,
            nextAction: `Follow up with ${row.assignedVendor} after owner review.`,
            ownerDecisionRequired: "Review",
            command: commandFor("Vendor Follow-Up Queue", `${row.assignedVendor}: ${row.issue}`, "Draft a vendor follow-up recommendation only.")
          }),
          emptyCommand("Vendor Follow-Up Queue", "vendor communications")
        )
      },
      {
        title: "Owner Approval Queue",
        source: "Owner Approvals",
        items: blockItems("Owner Approval Queue", ownerDecisions, 4)
      },
      {
        title: "Weekly Command Review",
        source: "Weekly Command Reviews / Follow-Ups",
        items: queueFromRows(
          "Weekly Command Review",
          followUps,
          (row) => ({
            id: row.id,
            status: row.status || row.group,
            nextAction: row.notes || row.item || "Include in weekly command review.",
            ownerDecisionRequired: row.group === "Overdue" ? "Yes" : "Review",
            command: commandFor("Weekly Command Review", `${row.date} ${row.property} ${row.unit}: ${row.item}`, row.notes || "Prepare weekly review note.")
          }),
          emptyCommand("Weekly Command Review", "weekly command reviews")
        )
      }
    ];
  }, [calendar.data, liveTrackers, maintenance.data, mortgage.data, notices.data, ownerDecisions, rent.data, urgentActions, utilities.data]);

  async function copyCommand(item: QueueItem) {
    const ok = await copyTextToClipboard(item.command);
    setCopiedId(ok ? item.id : null);
  }

  if (loading) {
    return <LoadingState label="Building owner automation queues..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <section className="section-block operational-automation">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Owner-Approved Automation Layer</p>
          <h2>Read-only queues and copyable commands</h2>
        </div>
        <ClipboardList size={20} aria-hidden />
      </div>
      <div className="remaining-safety-strip">
        <span>{sourceLabel}</span>
        <span>No messages sent</span>
        <span>No calendar events created</span>
        <span>No Drive or Sheets writes</span>
        <span>No items marked complete</span>
      </div>
      <div className="automation-panel-grid">
        {panels.map((panel) => (
          <article className="automation-panel-card" key={panel.title}>
            <div className="automation-panel-heading">
              <div>
                <span>{panel.source}</span>
                <strong>{panel.title}</strong>
              </div>
              <StatusBadge label={`${panel.items.length} item${panel.items.length === 1 ? "" : "s"}`} />
            </div>
            <div className="automation-item-list">
              {panel.items.map((item) => (
                <div className="automation-item" key={item.id}>
                  <div>
                    <StatusBadge label={item.status} />
                    <StatusBadge label={`Owner decision: ${item.ownerDecisionRequired}`} />
                  </div>
                  <p>{item.nextAction}</p>
                  <button type="button" onClick={() => copyCommand(item)}>
                    <Copy size={15} aria-hidden />
                    {copiedId === item.id ? "Copied" : "Copy Command"}
                  </button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      {!panels.length ? <EmptyState title="No automation queues" message="No dashboard rows are available for queue generation." /> : null}
    </section>
  );
}
