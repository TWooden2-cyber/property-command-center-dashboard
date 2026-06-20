"use client";

import type { SystemStatus } from "@/types/sheets";

type SheetsRefreshStatusProps = {
  system?: SystemStatus | null;
};

export function SheetsRefreshStatus({ system }: SheetsRefreshStatusProps) {
  const refreshLabel = system?.lastSuccessfulRefresh ? new Date(system.lastSuccessfulRefresh).toLocaleString() : "Not connected";
  const sourceLabel = system?.source === "google-sheets-readonly" ? "Live Google Sheets" : "Live data unavailable";
  const statusLabel = system?.dataMode === "live" ? "Live Sheets read-only" : "Not connected";

  return (
    <section className="section-block sheets-refresh-status">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{sourceLabel}</p>
          <h2>Last data refresh</h2>
        </div>
        <div className="source-badges">
          <span>Read-only</span>
          <span>{system?.connectionOk ? statusLabel : "Data source unavailable"}</span>
          <span>No write actions</span>
        </div>
      </div>
      <p className="muted-line">{refreshLabel}</p>
      {system?.connectionMessage ? <p className="muted-line">{system.connectionMessage}</p> : null}
      {system?.setupErrors?.length ? <p className="muted-line">Setup errors: {system.setupErrors.join(" ")}</p> : null}
      <p className="muted-line">Refresh page to pull latest Google Sheets data.</p>
    </section>
  );
}
