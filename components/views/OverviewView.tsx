"use client";

import { KpiCard } from "@/components/KpiCard";
import { OwnerDecisionPanel } from "@/components/OwnerDecisionPanel";
import { RiskPanel } from "@/components/RiskPanel";
import { DashboardBlockTable } from "@/components/DashboardBlockTable";
import { SheetsRefreshStatus } from "@/components/SheetsRefreshStatus";
import { EmptyState, ErrorState, LoadingState, WarningList } from "@/components/DataState";
import { useSheetsView } from "@/components/views/useSheetsView";
import type { DashboardBlock, DashboardBlockRow, OverviewData, RiskLevel } from "@/types/sheets";

type OverviewPayload = OverviewData & {
  dashboardBlocks?: {
    summary?: DashboardBlock;
    metrics?: DashboardBlock;
    liveTrackers?: DashboardBlock;
    ownerDecisions?: DashboardBlock;
    urgentActions?: DashboardBlock;
    maintenance?: DashboardBlock;
    googleDriveIntake?: DashboardBlock;
    gmailIntake?: DashboardBlock;
    calendarFollowUps?: DashboardBlock;
  };
};

type ExecutiveCard = {
  label: string;
  value: string;
  helper: string;
  tone: RiskLevel;
};

function firstRow(block?: DashboardBlock): DashboardBlockRow | undefined {
  return block?.rows[0];
}

function cell(row: DashboardBlockRow | undefined, key: string): string {
  return row?.values[key] || "";
}

function metric(block: DashboardBlock | undefined, label: string): string {
  const found = block?.rows.find((row) => cell(row, "Metric").toLowerCase() === label.toLowerCase());
  return cell(found, "Value");
}

function executiveCards(blocks: OverviewPayload["dashboardBlocks"]): ExecutiveCard[] {
  const summary = firstRow(blocks?.summary);
  const health = cell(summary, "Overall Health Rating") || metric(blocks?.metrics, "Health") || "Not set";
  const openTrackers = cell(summary, "Open Items") || metric(blocks?.metrics, "Open") || String(blocks?.liveTrackers?.rows.length ?? 0);
  const ownerDecisions = metric(blocks?.metrics, "Owner Decision Required") || String(blocks?.ownerDecisions?.rows.length ?? 0);
  const urgentActions = String(blocks?.urgentActions?.rows.length ?? 0);
  const maintenanceProof = String(blocks?.maintenance?.rows.length ?? 0);
  const followUps = String(blocks?.calendarFollowUps?.rows.length ?? 0);

  return [
    { label: "Dashboard Health", value: health, helper: "Portfolio command status", tone: health.toLowerCase().includes("yellow") ? "Watch" : "Stable" },
    { label: "Open Trackers", value: openTrackers, helper: "Active operating queue", tone: Number(openTrackers) > 0 ? "Watch" : "Stable" },
    { label: "Owner Decisions", value: ownerDecisions, helper: "Approval-gated items", tone: Number(ownerDecisions) > 0 ? "High" : "Stable" },
    { label: "Urgent Actions", value: urgentActions, helper: "Immediate review signals", tone: Number(urgentActions) > 0 ? "High" : "Stable" },
    { label: "Maintenance Proof Needed", value: maintenanceProof, helper: "Proof or owner override required", tone: Number(maintenanceProof) > 0 ? "Watch" : "Stable" },
    { label: "Upcoming Follow-Ups", value: followUps, helper: "Calendar-linked review items", tone: Number(followUps) > 0 ? "Normal" : "Stable" }
  ];
}

function safeAction(row: DashboardBlockRow | undefined): string {
  return cell(row, "Safe Action Label") || cell(row, "Safe Follow-Up Label") || cell(row, "Approval Gate") || "Review Dashboard queue";
}

function tracker(row: DashboardBlockRow | undefined): string {
  return cell(row, "Tracker ID") || "Portfolio";
}

export function OverviewView() {
  const { data, system, warnings, error, loading } = useSheetsView<OverviewPayload>("overview");

  if (loading) {
    return <LoadingState label="Loading owner overview..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState title="No overview data" message="Local sample workbook data is unavailable." />;
  }

  return (
    <div className="view-stack">
      <SheetsRefreshStatus system={system} />
      <section className="command-brief executive-command-hero">
        <div className="command-brief-copy">
          <p className="eyebrow">Source: Local Sample Workbook</p>
          <h2>Owner Command Center - Local Sample Dashboard</h2>
          <p>
            Local sample records are powering this reset view. Review owner-gated decisions first, then urgent signals,
            maintenance proof, and scheduled follow-ups.
          </p>
          <div className="hero-source-strip" aria-label="Dashboard data source">
            <span>Local sample data</span>
            <span>Read-only</span>
            <span>No live Google data or live actions</span>
          </div>
        </div>
        <div className="brief-actions">
          <article>
            <span>Decision queue</span>
            <strong>{tracker(firstRow(data.dashboardBlocks?.ownerDecisions))}</strong>
            <small>{safeAction(firstRow(data.dashboardBlocks?.ownerDecisions))}</small>
          </article>
          <article>
            <span>Urgent signal</span>
            <strong>{tracker(firstRow(data.dashboardBlocks?.urgentActions))}</strong>
            <small>{safeAction(firstRow(data.dashboardBlocks?.urgentActions))}</small>
          </article>
          <article>
            <span>Next follow-up</span>
            <strong>{tracker(firstRow(data.dashboardBlocks?.calendarFollowUps))}</strong>
            <small>{safeAction(firstRow(data.dashboardBlocks?.calendarFollowUps))}</small>
          </article>
        </div>
      </section>
      <WarningList warnings={data.warnings.length ? data.warnings : warnings} />
      <section className="executive-summary-grid">
        {executiveCards(data.dashboardBlocks).map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} helper={item.helper} tone={item.tone} />
        ))}
      </section>
      <section className="kpi-grid">
        {data.kpis.map((metric) => (
          <KpiCard key={metric.label} label={metric.label} value={metric.value} helper={metric.helper} tone={metric.tone} />
        ))}
      </section>
      <OwnerDecisionPanel decision={data.ownerDecision} />
      <RiskPanel risks={data.risks} />
      <DashboardBlockTable block={data.dashboardBlocks?.summary} />
      <DashboardBlockTable block={data.dashboardBlocks?.metrics} />
      <DashboardBlockTable block={data.dashboardBlocks?.liveTrackers} />
      <DashboardBlockTable block={data.dashboardBlocks?.ownerDecisions} />
      <DashboardBlockTable block={data.dashboardBlocks?.urgentActions} />
      <DashboardBlockTable block={data.dashboardBlocks?.maintenance} />
      <DashboardBlockTable block={data.dashboardBlocks?.googleDriveIntake} />
      <DashboardBlockTable block={data.dashboardBlocks?.gmailIntake} />
      <DashboardBlockTable block={data.dashboardBlocks?.calendarFollowUps} />
    </div>
  );
}
