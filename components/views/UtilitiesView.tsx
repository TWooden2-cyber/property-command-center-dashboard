"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { KpiCard } from "@/components/KpiCard";
import { SheetsSourcePanel } from "@/components/SheetsSourcePanel";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type { KpiMetric, UtilityRecord } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type UtilitiesPayload = {
  rows: UtilityRecord[];
};

type FilterState = {
  property: string;
  utilityType: string;
  year: string;
  paymentStatus: string;
  reviewStatus: string;
};

type ChartDatum = {
  label: string;
  value: number;
  helper?: string;
};

const emptyFilters: FilterState = {
  property: "All",
  utilityType: "All",
  year: "All",
  paymentStatus: "All",
  reviewStatus: "All"
};

const tableColumns: DataTableColumn<UtilityRecord>[] = [
  { key: "month", header: "Month", render: (row) => row.monthLabel || row.month || "Not set" },
  { key: "property", header: "Property", render: (row) => row.property || "Not set" },
  { key: "unitCommonArea", header: "Unit / Common Area", render: (row) => row.unitCommonArea || "Not set" },
  { key: "utilityType", header: "Utility Type", render: (row) => row.utilityType || "Not set" },
  { key: "provider", header: "Provider", render: (row) => row.provider || "Not set" },
  { key: "usageAmount", header: "Usage Amount", render: (row) => row.usageAmount.toLocaleString(), className: "numeric" },
  { key: "usageUnit", header: "Usage Unit", render: (row) => row.usageUnit || "Not set" },
  { key: "totalCost", header: "Total Cost", render: (row) => formatCurrency(row.totalCost), className: "numeric" },
  { key: "costPerUnit", header: "Cost Per Unit", render: (row) => formatCostPerUnit(row.costPerUnit), className: "numeric" },
  { key: "dueDate", header: "Due Date", render: (row) => formatDate(row.dueDate) },
  { key: "paymentStatus", header: "Payment Status", render: (row) => <StatusBadge label={row.paymentStatus || "Needs Entry"} /> },
  { key: "usageSpike", header: "Usage Spike?", render: (row) => <StatusBadge label={row.usageSpike ? "Usage Spike" : "Stable"} /> },
  { key: "reviewStatus", header: "Review Status", render: (row) => <StatusBadge label={row.reviewStatus || "Needs Review"} /> },
  { key: "billReceiptLink", header: "Bill / Receipt Link", render: (row) => <ExternalValue value={row.billReceiptLink} /> },
  { key: "notes", header: "Notes", render: (row) => row.notes || "None" }
];

function formatCostPerUnit(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value > 0 && value < 1 ? 4 : 2,
    maximumFractionDigits: value > 0 && value < 1 ? 4 : 2
  }).format(value || 0);
}

function ExternalValue({ value }: { value: string }) {
  if (!value) {
    return <StatusBadge label="Missing Bill" />;
  }

  if (value.startsWith("http")) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="table-link">
        Open bill
      </a>
    );
  }

  return <>{value}</>;
}

function uniqueValues(rows: UtilityRecord[], key: keyof UtilityRecord): string[] {
  return Array.from(new Set(rows.map((row) => String(row[key] ?? "").trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function sum(rows: UtilityRecord[], selector: (row: UtilityRecord) => number): number {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function groupBySum(rows: UtilityRecord[], labelFor: (row: UtilityRecord) => string, valueFor: (row: UtilityRecord) => number): ChartDatum[] {
  const grouped = rows.reduce<Record<string, number>>((acc, row) => {
    const label = labelFor(row) || "Not set";
    acc[label] = (acc[label] ?? 0) + valueFor(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function groupMonthlyCost(rows: UtilityRecord[]): ChartDatum[] {
  const grouped = rows.reduce<Record<string, { label: string; value: number }>>((acc, row) => {
    const key = row.monthKey || row.monthLabel || "unknown";
    acc[key] = acc[key] ?? { label: row.monthLabel || row.month || "Not set", value: 0 };
    acc[key].value += row.totalCost;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, item]) => item);
}

function matchesPortfolioSize(row: UtilityRecord, size: 4 | 7): boolean {
  const combined = `${row.property} ${row.unitCommonArea}`.toLowerCase();
  const words = size === 7 ? ["7-unit", "7 unit", "seven-unit", "seven unit"] : ["4-unit", "4 unit", "four-unit", "four unit"];
  return words.some((word) => combined.includes(word));
}

function isUnpaid(row: UtilityRecord): boolean {
  return row.paymentStatus.trim().toLowerCase() === "unpaid";
}

function needsBillReview(row: UtilityRecord): boolean {
  const review = row.reviewStatus.toLowerCase();
  const payment = row.paymentStatus.toLowerCase();
  return !row.billReceiptLink || review.includes("needs") || review.includes("missing") || payment.includes("needs entry");
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentYear() {
  return String(new Date().getFullYear());
}

function buildKpis(rows: UtilityRecord[]): KpiMetric[] {
  const ytdRows = rows.filter((row) => row.year === currentYear());
  const currentMonthRows = rows.filter((row) => row.monthKey === currentMonthKey());
  const monthCount = new Set(rows.map((row) => row.monthKey).filter(Boolean)).size || 1;
  const usageSpikes = rows.filter((row) => row.usageSpike).length;
  const unpaidBills = rows.filter(isUnpaid).length;
  const needsReview = rows.filter(needsBillReview).length;

  return [
    {
      label: "Total Utility Cost YTD",
      value: formatCurrency(sum(ytdRows, (row) => row.totalCost)),
      helper: `${currentYear()} records`,
      tone: "Normal"
    },
    {
      label: "Current Month Utility Cost",
      value: formatCurrency(sum(currentMonthRows, (row) => row.totalCost)),
      helper: "Calendar month",
      tone: "Normal"
    },
    {
      label: "7-Unit Utility Cost",
      value: formatCurrency(sum(rows.filter((row) => matchesPortfolioSize(row, 7)), (row) => row.totalCost)),
      helper: "Rows labeled 7-unit",
      tone: "Normal"
    },
    {
      label: "4-Unit Utility Cost",
      value: formatCurrency(sum(rows.filter((row) => matchesPortfolioSize(row, 4)), (row) => row.totalCost)),
      helper: "Rows labeled 4-unit",
      tone: "Normal"
    },
    {
      label: "Average Monthly Utility Cost",
      value: formatCurrency(sum(rows, (row) => row.totalCost) / monthCount),
      helper: `${monthCount} month${monthCount === 1 ? "" : "s"} in view`,
      tone: "Stable"
    },
    {
      label: "Usage Spikes",
      value: String(usageSpikes),
      helper: "Flagged by tracker",
      tone: usageSpikes > 0 ? "High" : "Stable"
    },
    {
      label: "Unpaid Utility Bills",
      value: String(unpaidBills),
      helper: "Payment status unpaid",
      tone: unpaidBills > 0 ? "Critical" : "Stable"
    },
    {
      label: "Missing Bills / Needs Review",
      value: String(needsReview),
      helper: "Receipt or review gaps",
      tone: needsReview > 0 ? "High" : "Stable"
    }
  ];
}

function BarChart({ title, data, valueFormatter = formatCurrency }: { title: string; data: ChartDatum[]; valueFormatter?: (value: number) => string }) {
  const max = Math.max(...data.map((item) => item.value), 0);

  return (
    <section className="chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Chart</p>
          <h2>{title}</h2>
        </div>
        <TrendingUp size={18} aria-hidden />
      </div>

      {data.length === 0 ? (
        <p className="muted-line">No chart data for the selected filters.</p>
      ) : (
        <div className="bar-list">
          {data.slice(0, 12).map((item) => {
            const width = max > 0 ? Math.max((item.value / max) * 100, 4) : 4;
            return (
              <div key={item.label} className="bar-row">
                <span>{item.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ "--bar-width": `${width}%` } as CSSProperties} />
                </div>
                <strong>{valueFormatter(item.value)}</strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SpikePanel({ rows }: { rows: UtilityRecord[] }) {
  const spikes = rows.filter((row) => row.usageSpike);

  return (
    <section className="chart-card spike-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Alert panel</p>
          <h2>Usage spikes</h2>
        </div>
        <AlertTriangle size={18} aria-hidden />
      </div>

      {spikes.length === 0 ? (
        <p className="muted-line">No usage spikes flagged in the selected records.</p>
      ) : (
        <div className="spike-list">
          {spikes.slice(0, 6).map((row) => (
            <article key={row.id}>
              <StatusBadge label="Usage Spike" />
              <div>
                <h3>{row.property || "Property not set"}</h3>
                <p>
                  {[row.monthLabel, row.utilityType, `${row.usageAmount.toLocaleString()} ${row.usageUnit}`].filter(Boolean).join(" / ")}
                </p>
              </div>
              <strong>{formatCurrency(row.totalCost)}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="All">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function UtilitiesView() {
  const { data, system, error, loading } = useSheetsView<UtilitiesPayload>("utilities");
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const utilitiesMissing = system?.missingTabs.includes("Utilities") ?? false;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      return (
        (filters.property === "All" || row.property === filters.property) &&
        (filters.utilityType === "All" || row.utilityType === filters.utilityType) &&
        (filters.year === "All" || row.year === filters.year) &&
        (filters.paymentStatus === "All" || row.paymentStatus === filters.paymentStatus) &&
        (filters.reviewStatus === "All" || row.reviewStatus === filters.reviewStatus)
      );
    });
  }, [filters, rows]);

  const kpis = useMemo(() => buildKpis(filteredRows), [filteredRows]);
  const monthlyCost = useMemo(() => groupMonthlyCost(filteredRows), [filteredRows]);
  const usageByUtilityType = useMemo(
    () => groupBySum(filteredRows, (row) => row.utilityType, (row) => row.usageAmount),
    [filteredRows]
  );
  const costByProperty = useMemo(
    () => groupBySum(filteredRows, (row) => row.property, (row) => row.totalCost),
    [filteredRows]
  );
  const costByUtilityType = useMemo(
    () => groupBySum(filteredRows, (row) => row.utilityType, (row) => row.totalCost),
    [filteredRows]
  );
  const yearOverYearUsage = useMemo(
    () => groupBySum(filteredRows, (row) => row.year || "Year not set", (row) => row.usageAmount).sort((a, b) => a.label.localeCompare(b.label)),
    [filteredRows]
  );

  if (loading) {
    return <LoadingState label="Loading utility records..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (utilitiesMissing) {
    return <ErrorState message="Utilities tab not found in the Master Tracker." />;
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="No utility records found."
        message="Enter monthly bills in the Utilities tab to see usage and cost trends."
      />
    );
  }

  return (
    <div className="view-stack">
      <SheetsSourcePanel system={system} error={error} loading={loading} />
      <section className="filter-panel">
        <SelectFilter
          label="Property"
          value={filters.property}
          options={uniqueValues(rows, "property")}
          onChange={(property) => setFilters((current) => ({ ...current, property }))}
        />
        <SelectFilter
          label="Utility Type"
          value={filters.utilityType}
          options={uniqueValues(rows, "utilityType")}
          onChange={(utilityType) => setFilters((current) => ({ ...current, utilityType }))}
        />
        <SelectFilter
          label="Year"
          value={filters.year}
          options={uniqueValues(rows, "year").sort((a, b) => b.localeCompare(a))}
          onChange={(year) => setFilters((current) => ({ ...current, year }))}
        />
        <SelectFilter
          label="Payment Status"
          value={filters.paymentStatus}
          options={uniqueValues(rows, "paymentStatus")}
          onChange={(paymentStatus) => setFilters((current) => ({ ...current, paymentStatus }))}
        />
        <SelectFilter
          label="Review Status"
          value={filters.reviewStatus}
          options={uniqueValues(rows, "reviewStatus")}
          onChange={(reviewStatus) => setFilters((current) => ({ ...current, reviewStatus }))}
        />
      </section>

      {filteredRows.length === 0 ? (
        <EmptyState title="No matching utility records." message="Adjust the filters to bring utility records back into view." />
      ) : (
        <>
          <section className="kpi-grid utilities-kpis">
            {kpis.map((metric) => (
              <KpiCard key={metric.label} label={metric.label} value={metric.value} helper={metric.helper} tone={metric.tone} />
            ))}
          </section>

          <div className="chart-grid">
            <BarChart title="Monthly Utility Cost Trend" data={monthlyCost} />
            <BarChart
              title="Usage Trend by Utility Type"
              data={usageByUtilityType}
              valueFormatter={(value) => value.toLocaleString()}
            />
            <BarChart title="Cost by Property" data={costByProperty} />
            <BarChart title="Cost by Utility Type" data={costByUtilityType} />
            {yearOverYearUsage.length > 1 ? (
              <BarChart
                title="Year-Over-Year Usage Comparison"
                data={yearOverYearUsage}
                valueFormatter={(value) => value.toLocaleString()}
              />
            ) : null}
            <SpikePanel rows={filteredRows} />
          </div>

          <DataTable rows={filteredRows} columns={tableColumns} />
        </>
      )}
    </div>
  );
}
