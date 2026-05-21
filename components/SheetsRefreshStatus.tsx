"use client";

import type { SystemStatus } from "@/types/sheets";

type SheetsRefreshStatusProps = {
  system?: SystemStatus | null;
};

export function SheetsRefreshStatus({ system }: SheetsRefreshStatusProps) {
  const refreshLabel = system?.lastSuccessfulRefresh ? new Date(system.lastSuccessfulRefresh).toLocaleString() : "Not connected";

  return (
    <section className="section-block sheets-refresh-status">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Local sample data</p>
          <h2>Last updated from local sample workbook</h2>
        </div>
        <div className="source-badges">
          <span>Read-only</span>
          <span>{system?.connectionOk ? "Local sample active" : "Local sample unavailable"}</span>
          <span>No live Google data or live actions</span>
        </div>
      </div>
      <p className="muted-line">{refreshLabel}</p>
      {system?.connectionMessage ? <p className="muted-line">{system.connectionMessage}</p> : null}
    </section>
  );
}
