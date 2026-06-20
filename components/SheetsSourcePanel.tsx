"use client";

import { StatusBadge } from "@/components/StatusBadge";
import type { SystemStatus } from "@/types/sheets";

export function sheetSourceLabel(system: SystemStatus | null, error?: string | null) {
  if (error) return "Sample/Fallback Data";
  if (system?.source === "google-sheets-readonly" && system.dataMode === "live") return "Live Google Sheets";
  if (system?.liveAttempted) return "Sample/Fallback Data";
  return "Local Static Data";
}

export function sheetSourceTone(system: SystemStatus | null, error?: string | null): "success" | "warning" | "danger" {
  if (error) return "danger";
  if (system?.source === "google-sheets-readonly" && system.dataMode === "live") return "success";
  return "warning";
}

export function SheetsSourcePanel({
  system,
  error,
  loading,
  fallbackDetail = "This page is using local sample/static data until live Google Sheets data is available."
}: {
  system: SystemStatus | null;
  error?: string | null;
  loading?: boolean;
  fallbackDetail?: string;
}) {
  const label = loading ? "Checking data source" : sheetSourceLabel(system, error);
  const detail =
    system?.source === "google-sheets-readonly" && system.dataMode === "live"
      ? `Read-only live Sheets data${system.lastSuccessfulRefresh ? ` refreshed ${new Date(system.lastSuccessfulRefresh).toLocaleString()}` : ""}.`
      : error || system?.connectionMessage || fallbackDetail;

  return (
    <section className="section-block sheets-refresh-status" aria-label="Dashboard data source">
      <div className="source-badges">
        <StatusBadge label={label} />
        {system?.liveAttempted ? <StatusBadge label="Live requested" /> : null}
      </div>
      <p className="muted-line">{detail}</p>
    </section>
  );
}
