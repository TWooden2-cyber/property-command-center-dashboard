"use client";

import { KpiCard } from "@/components/KpiCard";
import { OwnerDecisionPanel } from "@/components/OwnerDecisionPanel";
import { RiskPanel } from "@/components/RiskPanel";
import { DashboardBlockTable } from "@/components/DashboardBlockTable";
import { SheetsRefreshStatus } from "@/components/SheetsRefreshStatus";
import { EmptyState, ErrorState, LoadingState, WarningList } from "@/components/DataState";
import { useSheetsView } from "@/components/views/useSheetsView";
import type { DashboardBlock, OverviewData } from "@/types/sheets";

type OverviewPayload = OverviewData & {
  dashboardBlocks?: {
    summary?: DashboardBlock;
    metrics?: DashboardBlock;
    liveTrackers?: DashboardBlock;
    ownerDecisions?: DashboardBlock;
    urgentActions?: DashboardBlock;
    googleDriveIntake?: DashboardBlock;
    gmailIntake?: DashboardBlock;
  };
};

export function OverviewView() {
  const { data, system, warnings, error, loading } = useSheetsView<OverviewPayload>("overview");

  if (loading) {
    return <LoadingState label="Loading owner overview..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState title="No overview data" message="Connect the Google Sheet to populate the owner command center." />;
  }

  return (
    <div className="view-stack">
      <SheetsRefreshStatus system={system} />
      <WarningList warnings={data.warnings.length ? data.warnings : warnings} />
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
      <DashboardBlockTable block={data.dashboardBlocks?.googleDriveIntake} />
      <DashboardBlockTable block={data.dashboardBlocks?.gmailIntake} />
    </div>
  );
}
