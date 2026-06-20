"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, Database, Search, ShieldAlert } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import type { CommandPageConfig, CommandTableRow } from "@/types/commandPage";
import { commandCenterPeriod, monthOptions, yearOptions, type SignalTone } from "@/lib/propertyCommandCenterData";
import { localDevelopmentFallbackAllowed } from "@/components/views/liveSheetAdapters";

type FilterState = {
  search: string;
  tone: string;
};

function rowText(row: CommandTableRow) {
  return Object.values(row.values).join(" ").toLowerCase();
}

function toneLabel(tone?: SignalTone) {
  if (tone === "red") return "Blocked / Critical";
  if (tone === "yellow") return "Review Needed";
  return "Ready / Stable";
}

function CommandHeader({ config }: { config: CommandPageConfig }) {
  return (
    <section className="remaining-command-header">
      <div>
        <span className="eyebrow">Local Sample Mode</span>
        <h2>{config.title}</h2>
        <p>{config.subtitle}</p>
      </div>
      <div className="remaining-header-stack">
        <StatusBadge label={config.localNotice} />
        <StatusBadge label="Last updated: May 21, 2026, 9:00 AM local sample workbook" />
        <div className="filter-inline">
          <label>
            Month
            <select value={commandCenterPeriod.monthName} disabled>
              {monthOptions.map((month) => (
                <option key={month}>{month}</option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select value={commandCenterPeriod.year} disabled>
              {yearOptions.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

function CommandKpis({ config }: { config: CommandPageConfig }) {
  return (
    <section className="remaining-kpi-grid">
      {config.kpis.map((item) => (
        <article className={`kpi-card status-strip ${item.tone}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.helper}</small>
        </article>
      ))}
    </section>
  );
}

function HealthPanel({ config }: { config: CommandPageConfig }) {
  return (
    <section className="remaining-health-panel">
      <span className="eyebrow">Command Evaluation</span>
      <h3>{config.healthStatus}</h3>
      <p>{config.healthDetail}</p>
      <div className="remaining-safety-strip">
        <span>Owner approval required</span>
        <span>Live writes disabled</span>
        <span>Preview/copy commands only</span>
        <span>No live external services connected</span>
      </div>
    </section>
  );
}

function FilterPanel({
  filters,
  setFilters,
  config
}: {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  config: CommandPageConfig;
}) {
  return (
    <section className="remaining-filter-panel">
      <div className="remaining-filter-grid">
        <label>
          Search
          <span className="search-field">
            <Search size={16} />
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search table and notes" />
          </span>
        </label>
        <label>
          Risk / Tone
          <select value={filters.tone} onChange={(event) => setFilters({ ...filters, tone: event.target.value })}>
            <option>All</option>
            <option>Blocked / Critical</option>
            <option>Review Needed</option>
            <option>Ready / Stable</option>
          </select>
        </label>
      </div>
      <div className="remaining-filter-tags">
        {config.filters.map((filter) => (
          <span key={filter}>{filter}</span>
        ))}
      </div>
    </section>
  );
}

function Queues({ config }: { config: CommandPageConfig }) {
  return (
    <section className="remaining-queue-grid">
      {config.queues.map((queue) => (
        <article className={`remaining-queue-card queue-${queue.tone}`} key={queue.title}>
          <ShieldAlert size={19} />
          <h3>{queue.title}</h3>
          <p>{queue.detail}</p>
          <div className="calendar-mini-list">
            {queue.items.map((item) => (
              <div key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function BlockedAndApproval({ config }: { config: CommandPageConfig }) {
  return (
    <section className="calendar-two-column">
      <article className="calendar-blocked-panel">
        <h3>Blocked Until Verified</h3>
        <ul>
          {config.blocked.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
      <article className="calendar-preview-panel">
        <h3>Owner Approval Gate</h3>
        <div className="remaining-approval-list">
          {config.approvalGate.map((item) => (
            <span key={item}>
              <CheckCircle2 size={15} />
              {item}
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}

function RelatedLinks({ config }: { config: CommandPageConfig }) {
  if (!config.relatedLinks?.length) {
    return null;
  }

  return (
    <section className="remaining-related-grid">
      {config.relatedLinks.map((link) => (
        <article className={`remaining-queue-card queue-${link.tone}`} key={link.href}>
          <ShieldAlert size={19} />
          <h3>{link.title}</h3>
          <p>{link.detail}</p>
          <Link href={link.href as Route} className="summary-link-button">
            {link.action}
          </Link>
        </article>
      ))}
    </section>
  );
}

function SafetyFooter({ config }: { config: CommandPageConfig }) {
  return (
    <section className="remaining-safety-footer">
      <Database size={18} />
      <p>{config.safetyFooter}</p>
    </section>
  );
}

export function CommandPageView({ config }: { config: CommandPageConfig }) {
  const [filters, setFilters] = useState<FilterState>({ search: "", tone: "All" });
  const rows = useMemo(() => {
    return config.tableRows.filter((row) => {
      const toneMatches = filters.tone === "All" || toneLabel(row.tone) === filters.tone;
      const searchMatches = !filters.search || rowText(row).includes(filters.search.toLowerCase());
      return toneMatches && searchMatches;
    });
  }, [config.tableRows, filters]);

  const columns: DataTableColumn<CommandTableRow>[] = useMemo(
    () =>
      config.tableColumns.map((column) => ({
        key: column.key,
        header: column.header,
        render: (row) => {
          const value = row.values[column.key] || "Not set";
          if (["status", "risk", "proof", "approval", "blocked"].includes(column.key.toLowerCase())) {
            return <StatusBadge label={value} />;
          }
          return value;
        }
      })),
    [config.tableColumns]
  );

  if (!localDevelopmentFallbackAllowed) {
    return (
      <div className="remaining-command-page">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live data not connected</p>
              <h2>{config.title}</h2>
            </div>
            <StatusBadge label="No sample data shown" />
          </div>
          <p>
            This production tab is not yet wired to a verified live Google Sheets parser or approved live Google API. It will not display
            sample, mock, demo, fallback, hardcoded, or local static records.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="remaining-command-page">
      <CommandHeader config={config} />
      <RelatedLinks config={config} />
      <CommandKpis config={config} />
      <HealthPanel config={config} />
      <FilterPanel filters={filters} setFilters={setFilters} config={config} />
      {rows.length ? <DataTable rows={rows} columns={columns} /> : <EmptyState title="No matching local sample records" message="Adjust filters to restore records." />}
      <Queues config={config} />
      <BlockedAndApproval config={config} />
      <SafetyFooter config={config} />
    </div>
  );
}
