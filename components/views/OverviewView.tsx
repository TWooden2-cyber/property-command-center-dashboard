"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FolderKanban, ShieldCheck, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/DataState";
import { SheetsSourcePanel } from "@/components/SheetsSourcePanel";
import { StatusBadge } from "@/components/StatusBadge";
import {
  localDevelopmentFallbackAllowed
} from "@/components/views/liveSheetAdapters";
import {
  computeDashboardHealth,
  maintenanceRows,
  money,
  monthOptions,
  monthlyCashflowTrend,
  monthlyRentTrend,
  mortgageRows,
  percent,
  rentTotals,
  toneForStatus,
  yearOptions,
  type HealthStatus,
  type SignalTone
} from "@/lib/propertyCommandCenterData";
import { useSheetsView } from "@/components/views/useSheetsView";
import type { GoogleProductStatus } from "@/types/googleProducts";
import type { DashboardBlock, KpiMetric, OverviewData, RiskItem } from "@/types/sheets";

type OverviewPayload = OverviewData & {
  dashboardBlocks: Record<string, DashboardBlock>;
};

type Kpi = {
  label: string;
  value: string;
  helper: string;
  tone: SignalTone;
  footer: string;
};

type DriveProductPayload = {
  ok?: boolean;
  status?: GoogleProductStatus;
  error?: string;
};

type DriveProductDetails = {
  folderName?: string;
  folderId?: string;
  visibleFolderCount?: number;
  keyFoldersFound?: string[];
  missingKeyFolders?: string[];
  recentIntakeCount?: number | null;
};

const currentPeriod = {
  monthName: "May",
  year: 2026
};

function overviewKpis(): Kpi[] {
  const health = computeDashboardHealth();
  const rentRate = health.rentCollectionRate;
  const maintenanceCritical = maintenanceRows.some((row) => row.priority === "Critical" && row.status.toLowerCase() !== "complete");
  const mortgagePaidCurrent = mortgageRows.every((row) => row.currentArrears === 0 && !row.confirmationSaved.toLowerCase().includes("pending"));
  const mortgagePending = mortgageRows.some((row) => row.confirmationSaved.toLowerCase().includes("pending"));
  const noi = rentTotals.collected - health.utilityCost - health.maintenanceCost - mortgageRows.reduce((total, row) => total + row.mortgageDueMonthly, 0);
  const cashflow = rentTotals.collected - health.utilityCost - health.maintenanceCost - mortgageRows.reduce((total, row) => total + row.paidThisMonth, 0);

  return [
    {
      label: "Month Total Rent Collected",
      value: money(rentTotals.collected),
      helper: `${percent(rentRate)} of projected rent`,
      tone: rentRate >= 1 ? "green" : rentRate > 0.5 ? "yellow" : "red",
      footer: rentRate >= 1 ? "100% collected" : rentRate > 0.5 ? "Above 50%, verification needed" : "Under 50%, urgent"
    },
    {
      label: "Month Projected Rent",
      value: money(rentTotals.projected),
      helper: `${money(rentTotals.balance)} balance tracked`,
      tone: rentTotals.balance === 0 ? "green" : rentRate > 0.5 ? "yellow" : "red",
      footer: rentTotals.balance === 0 ? "No balance tracked" : "Balance remains"
    },
    {
      label: "Month Utility Cost",
      value: money(health.utilityCost),
      helper: "Electric and water total",
      tone: health.utilityCost > 550 ? "red" : "green",
      footer: health.utilityCost > 550 ? "Over $550 threshold" : "Under $550 threshold"
    },
    {
      label: "Month Maintenance Cost",
      value: money(health.maintenanceCost),
      helper: maintenanceCritical ? "Critical maintenance item open" : "No urgent issue",
      tone: health.maintenanceCost > 500 || maintenanceCritical ? "red" : "green",
      footer: maintenanceCritical ? "Urgent issue open" : "$500 or under"
    },
    {
      label: "Mortgage Payments Paid",
      value: money(mortgageRows.reduce((total, row) => total + row.paidThisMonth, 0)),
      helper: "Posting confirmation status tracked",
      tone: mortgagePaidCurrent ? "green" : mortgagePending ? "yellow" : "red",
      footer: mortgagePending ? "Confirmation pending" : mortgagePaidCurrent ? "Paid/current" : "Arrears or unpaid"
    },
    {
      label: "NOI",
      value: money(noi),
      helper: "Rent collected minus operating costs and mortgage due",
      tone: noi > 500 ? "green" : noi >= 0 ? "yellow" : "red",
      footer: noi > 0 ? "Positive" : noi === 0 ? "Near break-even" : "Negative"
    },
    {
      label: "Month Cashflow",
      value: money(cashflow),
      helper: "Includes actual mortgage payments paid this month",
      tone: cashflow > 500 ? "green" : cashflow >= 0 ? "yellow" : "red",
      footer: cashflow > 0 ? "Positive" : cashflow === 0 ? "Near break-even" : "Negative"
    }
  ];
}

function KpiTile({ item }: { item: Kpi }) {
  return (
    <article className={`kpi-card status-strip ${item.tone}`}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <small>{item.helper}</small>
      <footer>{item.footer}</footer>
    </article>
  );
}

function HealthCard({ label, status, explanation }: { label: string; status: HealthStatus; explanation: string }) {
  return (
    <article className={`health-card health-${toneForStatus(status)}`}>
      <div>
        <span>{label}</span>
        <strong>{status}</strong>
      </div>
      <p>{explanation}</p>
    </article>
  );
}

function Section({
  eyebrow,
  title,
  children,
  icon
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {icon}
      </div>
      {children}
    </section>
  );
}

function FilterBar({
  month,
  year,
  onMonthChange,
  onYearChange
}: {
  month: string;
  year: number;
  onMonthChange: (value: string) => void;
  onYearChange: (value: number) => void;
}) {
  return (
    <section className="command-filter-bar">
      <div className="dashboard-updated">
        <span>Display period</span>
        <strong>{month} {year}</strong>
      </div>
      <label>
        <span>Month</span>
        <select value={month} onChange={(event) => onMonthChange(event.target.value)}>
          {monthOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Year</span>
        <select value={year} onChange={(event) => onYearChange(Number(event.target.value))}>
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function toneFromRisk(tone?: KpiMetric["tone"]): SignalTone {
  if (tone === "Critical" || tone === "High" || tone === "Watch") return tone === "Watch" ? "yellow" : "red";
  return "green";
}

function LiveKpiTile({ item }: { item: KpiMetric }) {
  const tone = toneFromRisk(item.tone);
  return (
    <article className={`kpi-card command-kpi kpi-${tone}`}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <p>{item.helper ?? "Live Google Sheets metric"}</p>
      <footer>{item.tone ?? "Live"}</footer>
    </article>
  );
}

function LiveRiskGrid({ risks }: { risks: RiskItem[] }) {
  if (!risks.length) return null;

  return (
    <section className="health-grid">
      {risks.map((risk) => (
        <article key={risk.label} className={`health-card health-${toneFromRisk(risk.level)}`}>
          <span>{risk.label}</span>
          <strong>{risk.level}</strong>
          <p>{risk.summary}</p>
        </article>
      ))}
    </section>
  );
}

function driveDetails(status?: GoogleProductStatus | null): DriveProductDetails {
  return (status?.details ?? {}) as DriveProductDetails;
}

function OverviewDriveSnapshot() {
  const [driveStatus, setDriveStatus] = useState<GoogleProductStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDriveStatus() {
      try {
        const response = await fetch("/api/google/drive/status", { cache: "no-store" });
        const payload = (await response.json()) as DriveProductPayload;
        if (!mounted) return;
        setDriveStatus(payload.status ?? null);
        setError(response.ok ? null : payload.error || payload.status?.message || "Drive status could not be loaded.");
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError instanceof Error ? requestError.message : "Drive status could not be loaded.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDriveStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const details = driveDetails(driveStatus);
  const connected = Boolean(driveStatus?.connected);
  const foundFolders = details.keyFoldersFound || [];
  const missingFolders = details.missingKeyFolders || [];
  const visibleFolderCount = typeof details.visibleFolderCount === "number" ? details.visibleFolderCount : null;
  const recentIntakeCount = typeof details.recentIntakeCount === "number" ? details.recentIntakeCount : null;
  const metrics: Array<{ label: string; value: string; helper: string; tone: SignalTone }> = [
    {
      label: "Drive Status",
      value: loading ? "Checking" : connected ? "Live" : "Review",
      helper: driveStatus?.mode || "Read-only metadata",
      tone: connected ? "green" : error ? "red" : "yellow"
    },
    {
      label: "Visible Folders",
      value: visibleFolderCount === null ? "N/A" : String(visibleFolderCount),
      helper: details.folderName || "Root folder",
      tone: connected ? "green" : "yellow"
    },
    {
      label: "Key Folders",
      value: String(foundFolders.length),
      helper: "Matched in Drive root",
      tone: foundFolders.length ? "green" : connected ? "yellow" : "red"
    },
    {
      label: "Missing / Review",
      value: String(missingFolders.length),
      helper: "Future owner-approved package",
      tone: missingFolders.length ? "yellow" : "green"
    },
    {
      label: "Intake Queue",
      value: recentIntakeCount === null ? "N/A" : String(recentIntakeCount),
      helper: "Intake folder children",
      tone: recentIntakeCount && recentIntakeCount > 0 ? "yellow" : "green"
    }
  ];

  return (
    <section className={`overview-drive-snapshot ${connected ? "connected" : "needs-review"}`}>
      <div className="overview-drive-copy">
        <div className="panel-icon">
          <FolderKanban size={20} aria-hidden />
        </div>
        <div>
          <p className="eyebrow">Google Drive System</p>
          <h2>{loading ? "Checking Drive folder health" : connected ? "Drive proof folders are visible" : "Drive proof folders need review"}</h2>
          <p>
            {loading
              ? "Checking read-only Drive metadata."
              : connected
                ? driveStatus?.message || "Google Drive read-only metadata connection verified."
                : error || driveStatus?.message || "Google Drive read-only metadata is not connected."}
          </p>
          <div className="hero-source-strip">
            <span>{connected ? "Production read-only live" : "Connection review"}</span>
            <span>{details.folderName || "Root folder not verified"}</span>
            <span>No Drive writes</span>
          </div>
        </div>
      </div>
      <div className="overview-drive-metrics">
        {metrics.map((metric) => (
          <article key={metric.label} className={`status-strip ${metric.tone}`}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.helper}</small>
          </article>
        ))}
      </div>
      <div className="overview-drive-actions">
        <StatusBadge label={connected ? "Read-only verified" : "Reconnect review"} />
        <Link href="/drive-update-center" className="summary-link-button">
          Open Drive System
        </Link>
        {!connected ? (
          <Link href="/google-connection-center" className="summary-link-button secondary">
            Open Connection Center
          </Link>
        ) : (
          <span><ShieldCheck size={16} aria-hidden /> Writes blocked</span>
        )}
      </div>
    </section>
  );
}

function ComparisonChart({ title, projected, collected }: { title: string; projected: number; collected: number }) {
  const max = Math.max(projected, collected, 1);
  const bars = [
    { label: "Projected", value: projected },
    { label: "Collected", value: collected }
  ];

  return (
    <section className="chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chart</p>
          <h2>{title}</h2>
        </div>
        <TrendingUp size={18} aria-hidden />
      </div>
      <div className="command-chart-bars">
        {bars.map((bar) => (
          <div key={bar.label} className="command-chart-row">
            <span>{bar.label}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ "--bar-width": `${Math.max((bar.value / max) * 100, 4)}%` } as CSSProperties} />
            </div>
            <strong>{money(bar.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function YearTrendChart() {
  const projected = monthlyRentTrend.reduce((total, item) => total + item.projected, 0);
  const collected = monthlyRentTrend.reduce((total, item) => total + item.collected, 0);

  return <ComparisonChart title="Year Paid vs Projected" projected={projected} collected={collected} />;
}

function MonthlyCashflowTrendChart() {
  const maxMagnitude = Math.max(...monthlyCashflowTrend.flatMap((row) => [Math.abs(row.cashflow), Math.abs(row.noi)]), 1);
  const points = monthlyCashflowTrend.map((row, index) => {
    const x = monthlyCashflowTrend.length === 1 ? 50 : (index / (monthlyCashflowTrend.length - 1)) * 100;
    const y = 100 - ((row.noi + maxMagnitude) / (maxMagnitude * 2)) * 100;
    return `${x},${y}`;
  });

  return (
    <Section eyebrow="Cashflow Charts" title="Monthly Cashflow Trend" icon={<TrendingUp size={20} aria-hidden />}>
      <div className="cashflow-trend-card">
        <div className="cashflow-chart-area" aria-label="Monthly cashflow bar chart with NOI line trend">
          <svg className="cashflow-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polyline points={points.join(" ")} />
          </svg>
          {monthlyCashflowTrend.map((row) => {
            const positive = row.cashflow >= 0;
            const barHeight = Math.max((Math.abs(row.cashflow) / maxMagnitude) * 48, 4);
            return (
              <div key={row.month} className="cashflow-month">
                <div className="cashflow-bar-stage">
                  <span
                    className={positive ? "cashflow-bar positive" : "cashflow-bar negative"}
                    style={{ "--bar-height": `${barHeight}%` } as CSSProperties}
                  />
                </div>
                <strong>{row.month.replace(" 2026", "")}</strong>
              </div>
            );
          })}
        </div>
        <div className="cashflow-trend-legend">
          <span><i className="legend-bar" /> Monthly cashflow bar</span>
          <span><i className="legend-line" /> NOI line</span>
        </div>
        <div className="cashflow-detail-grid">
          {monthlyCashflowTrend.map((row) => (
            <article key={row.month} className={row.cashflow >= 0 ? "cashflow-detail positive" : "cashflow-detail negative"}>
              <span>{row.month}</span>
              <strong>{money(row.cashflow)}</strong>
              <dl>
                <div><dt>Projected</dt><dd>{money(row.projectedRent)}</dd></div>
                <div><dt>Collected</dt><dd>{money(row.rentCollected)}</dd></div>
                <div><dt>Utilities</dt><dd>{money(row.utilities)}</dd></div>
                <div><dt>Maintenance</dt><dd>{money(row.maintenance)}</dd></div>
                <div><dt>Mortgage Paid</dt><dd>{money(row.mortgagePaid)}</dd></div>
                <div><dt>NOI</dt><dd>{money(row.noi)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <p className="cashflow-chart-note">Cashflow is based on dashboard data currently loaded in the operation center.</p>
      </div>
    </Section>
  );
}

export function OverviewView() {
  const [selectedMonth, setSelectedMonth] = useState(currentPeriod.monthName);
  const [selectedYear, setSelectedYear] = useState(currentPeriod.year);
  const { data, system, error, loading } = useSheetsView<OverviewPayload>("overview");
  const health = useMemo(() => computeDashboardHealth(), []);
  const kpis = useMemo(() => overviewKpis(), []);
  const hasPeriodData = selectedMonth === currentPeriod.monthName && selectedYear === currentPeriod.year;
  const isLive = system?.source === "google-sheets-readonly" && system.dataMode === "live";
  const dataSourceLabel = isLive ? "Live Google Sheets" : "Live data unavailable";
  const lastRefreshLabel = system?.lastSuccessfulRefresh ? new Date(system.lastSuccessfulRefresh).toLocaleString() : "Not available";
  const showLocalDevelopmentDashboard = localDevelopmentFallbackAllowed && !isLive;

  return (
    <div className="view-stack overview-dashboard">
      <FilterBar month={selectedMonth} year={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
      <SheetsSourcePanel system={system} error={error} loading={loading} />
      <OverviewDriveSnapshot />

      {!hasPeriodData && showLocalDevelopmentDashboard ? (
        <EmptyState title="No data available for this period." message="Choose May 2026 to view the current operation center dashboard." />
      ) : (
        <>
          <section className="command-health-hero">
            <div>
              <p className="eyebrow">{dataSourceLabel}</p>
              <h2>{isLive ? "Live Google Sheets dashboard" : "Live Google Sheets data unavailable"}</h2>
              <p>
                {isLive
                  ? "Current status is read from the configured Property Management Master Tracker."
                  : "The production dashboard does not display sample or local static data when live Google Sheets is unavailable."}
              </p>
              <div className="hero-source-strip">
                <span>{dataSourceLabel}</span>
                <span>Last refreshed: {lastRefreshLabel}</span>
                <span>Status dashboard</span>
              </div>
            </div>
            {showLocalDevelopmentDashboard ? (
              <div className={`health-score health-${toneForStatus(health.overallHealth)}`}>
                <span>Health score</span>
                <strong>{health.overallHealth}</strong>
                <small>{percent(health.rentCollectionRate)} rent collected</small>
              </div>
            ) : null}
          </section>

          <section className="command-kpi-grid">
            {isLive && data?.kpis?.length ? data.kpis.map((item) => <LiveKpiTile key={item.label} item={item} />) : showLocalDevelopmentDashboard ? kpis.map((item) => <KpiTile key={item.label} item={item} />) : null}
          </section>

          {isLive && data?.risks?.length ? (
            <LiveRiskGrid risks={data.risks} />
          ) : showLocalDevelopmentDashboard ? (
            <section className="health-grid">
              {health.signals.map((signal) => (
                <HealthCard key={signal.label} label={signal.label} status={signal.status} explanation={signal.explanation} />
              ))}
            </section>
          ) : null}

          {showLocalDevelopmentDashboard ? (
            <Section eyebrow="Cause of increase/decrease" title="Why totals changed" icon={<AlertTriangle size={20} aria-hidden />}>
              <div className="cause-grid">
                {health.causes.map((cause) => (
                  <article key={cause}>
                    <CheckCircle2 size={17} aria-hidden />
                    <p>{cause}</p>
                  </article>
                ))}
              </div>
            </Section>
          ) : null}

          {showLocalDevelopmentDashboard ? (
            <>
              <div className="chart-grid">
                <ComparisonChart title="Month Paid vs Projected" projected={rentTotals.projected} collected={rentTotals.collected} />
                <YearTrendChart />
              </div>

              <MonthlyCashflowTrendChart />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
