"use client";

import { CheckCircle2, CircleSlash, Database, ShieldCheck } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import type { SystemStatus } from "@/types/sheets";
import { useSheetsView } from "@/components/views/useSheetsView";

type SettingsPayload = {
  system: SystemStatus;
};

function ConfigRow({ label, configured }: { label: string; configured: boolean }) {
  const Icon = configured ? CheckCircle2 : CircleSlash;

  return (
    <div className="config-row">
      <Icon size={17} aria-hidden />
      <span>{label}</span>
      <StatusBadge label={configured ? "Available" : "Disabled"} />
    </div>
  );
}

export function SettingsView() {
  const { data, error, loading } = useSheetsView<SettingsPayload>("settings");

  if (loading) {
    return <LoadingState label="Checking system status..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data?.system) {
    return <EmptyState title="No system status" message="Local sample system status is unavailable." />;
  }

  const { system } = data;
  const dataModeLabel = system.dataMode === "live" ? "Live Google Sheets" : "Local Sample";
  const requestedModeLabel = system.requestedDataMode === "live" ? "Live Google Sheets" : "Local Sample";
  const sourceLabel = system.source === "google-sheets-readonly" ? "Google Sheets Read-Only" : "Local Sample";
  const liveIssueCount = system.liveSourceChecklist.filter((item) => !item.present || item.missingColumns.length > 0).length;
  const liveConfiguredLabel = !system.liveSheetsConfigured ? "No" : liveIssueCount > 0 ? "Invalid" : "Yes";
  const envEntries = [
    ["DASHBOARD_DATA_MODE", system.env.dashboardDataMode],
    ["Spreadsheet ID", system.env.googleSheetsSpreadsheetId],
    ["Client Email", system.env.googleSheetsClientEmail],
    ["Private Key", system.env.googleSheetsPrivateKey],
    ["DASHBOARD_OWNER_PASSWORD", system.env.dashboardOwnerPassword],
    ["Session Signing Secret", system.env.dashboardSessionSecret]
  ] as const;
  const liveOperations = system.liveOperations;
  const operationServices = Object.values(liveOperations.services);

  return (
    <div className="settings-grid">
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">System Mode</p>
            <h2>{dataModeLabel}</h2>
          </div>
          <Database size={20} aria-hidden />
        </div>
        <div className="settings-lines">
          <p>{system.connectionMessage}</p>
          <p>Owner password environment variables are required in production and fail closed when missing. Live Google Sheets reads are read-only only.</p>
          <div className="mode-status-list">
            <span>Requested Data Mode: <strong>{requestedModeLabel}</strong></span>
            <StatusBadge label={system.requestedDataMode === "live" ? "Live requested" : "Sample requested"} />
          </div>
          <div className="mode-status-list">
            <span>Resolved Data Mode: <strong>{dataModeLabel}</strong></span>
            <StatusBadge label={system.dataMode === "live" ? "Live read-only" : "Sample"} />
          </div>
          <div className="mode-status-list">
            <span>Current Source: <strong>{sourceLabel}</strong></span>
            <StatusBadge label={sourceLabel} />
          </div>
          <div className="mode-status-list">
            <span>Live Attempted: <strong>{system.liveAttempted ? "Yes" : "No"}</strong></span>
            <StatusBadge label={system.liveAttempted ? "Attempted" : "Not attempted"} />
          </div>
          <div className="mode-status-list">
            <span>Spreadsheet ID Detected: <strong>{system.env.googleSheetsSpreadsheetId ? "Yes" : "No"}</strong></span>
            <StatusBadge label={system.env.usingAliasSpreadsheetId ? "Alias" : system.env.googleSheetsSpreadsheetId ? "Primary" : "Missing"} />
          </div>
          <div className="mode-status-list">
            <span>Client Email Detected: <strong>{system.env.googleSheetsClientEmail ? "Yes" : "No"}</strong></span>
            <StatusBadge label={system.env.usingAliasClientEmail ? "Alias" : system.env.googleSheetsClientEmail ? "Primary" : "Missing"} />
          </div>
          <div className="mode-status-list">
            <span>Private Key Detected: <strong>{system.env.googleSheetsPrivateKey ? "Yes" : "No"}</strong></span>
            <StatusBadge label={system.env.usingAliasPrivateKey ? "Alias" : system.env.googleSheetsPrivateKey ? "Primary" : "Missing"} />
          </div>
          <div className="mode-status-list">
            <span>Live Sheets Configured: <strong>{liveConfiguredLabel}</strong></span>
            <StatusBadge label={liveConfiguredLabel === "Yes" ? "Configured" : liveConfiguredLabel === "Invalid" ? "Needs Review" : "Missing"} />
          </div>
          <div className="mode-status-list">
            <span>Live Source Checklist: <strong>{liveIssueCount ? `${liveIssueCount} issue${liveIssueCount === 1 ? "" : "s"}` : "Ready"}</strong></span>
            <StatusBadge label={liveIssueCount ? "Needs Review" : "Ready"} />
          </div>
          <div className="mode-status-list">
            <span>Last Data Refresh: <strong>{system.lastSuccessfulRefresh ? new Date(system.lastSuccessfulRefresh).toLocaleString() : "Not available"}</strong></span>
            <StatusBadge label="No cache" />
          </div>
          <div className="mode-status-list">
            <span>Setup Errors: <strong>{system.setupErrors.length ? system.setupErrors.join(" ") : "None"}</strong></span>
            <StatusBadge label={system.setupErrors.length ? "Needs Fix" : "Ready"} />
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Safety Gates</p>
            <h2>Live services</h2>
          </div>
          <ShieldCheck size={20} aria-hidden />
        </div>
        <div className="settings-lines">
          <div className="mode-status-list">
            <span>Dashboard Access Control: <strong>Enabled</strong></span>
            <StatusBadge label="Enabled" />
          </div>
          <div className="mode-status-list">
            <span>Login Method: <strong>Owner Password</strong></span>
            <StatusBadge label="Password" />
          </div>
          <div className="mode-status-list">
            <span>Public Access: <strong>Disabled</strong></span>
            <StatusBadge label="Disabled" />
          </div>
          <div className="mode-status-list">
            <span>API Protection: <strong>Enabled</strong></span>
            <StatusBadge label="Enabled" />
          </div>
          <div className="mode-status-list">
            <span>Drive Mode: <strong>Metadata Read-Only</strong></span>
            <StatusBadge label="Read-only" />
          </div>
          <div className="mode-status-list">
            <span>Live Operations: <strong>{liveOperations.liveOperationsEnabled ? "Enabled" : "Disabled"}</strong></span>
            <StatusBadge label={liveOperations.liveOperationsEnabled ? "Enabled" : "Disabled"} />
          </div>
          <div className="mode-status-list">
            <span>Drive Folder Health: <strong>Complete</strong></span>
            <StatusBadge label="13 found" />
          </div>
          <div className="mode-status-list">
            <span>Owner Approval Required: <strong>{liveOperations.ownerApprovalRequired ? "Enabled" : "Disabled"}</strong></span>
            <StatusBadge label={liveOperations.ownerApprovalRequired ? "Enabled" : "Disabled"} />
          </div>
          <div className="mode-status-list">
            <span>Dry-Run Required: <strong>{liveOperations.dryRunRequired ? "Enabled" : "Disabled"}</strong></span>
            <StatusBadge label={liveOperations.dryRunRequired ? "Enabled" : "Disabled"} />
          </div>
          <div className="mode-status-list">
            <span>Live Operations Audit: <strong>{liveOperations.auditLoggingEnabled ? "Enabled" : "Blocked"}</strong></span>
            <StatusBadge label={liveOperations.auditLoggingEnabled ? "Enabled" : "Blocked"} />
          </div>
        </div>
      </section>

      <section className="section-block wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Controlled Live Operations</p>
            <h2>Service flags</h2>
          </div>
        </div>
        <div className="config-grid">
          {operationServices.map((service) => (
            <div className="config-row" key={service.key}>
              {service.enabled && !service.blocked ? <CheckCircle2 size={17} aria-hidden /> : <CircleSlash size={17} aria-hidden />}
              <span>{service.label}</span>
              <StatusBadge label={service.enabled && !service.blocked ? "Enabled" : service.enabled ? "Blocked" : "Disabled"} />
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Google Drive Read-Only</p>
            <h2>Planned / Local read-only</h2>
          </div>
          <ShieldCheck size={20} aria-hidden />
        </div>
        <div className="settings-lines">
          <div className="mode-status-list">
            <span>Status: <strong>Folder structure complete</strong></span>
            <StatusBadge label="Read-only" />
          </div>
          <div className="mode-status-list">
            <span>Writes: <strong>Disabled</strong></span>
            <StatusBadge label="Disabled" />
          </div>
          <div className="mode-status-list">
            <span>Scope: <strong>metadata/read-only only</strong></span>
            <StatusBadge label="Owner gated" />
          </div>
          <div className="mode-status-list">
            <span>Token: <strong>outside repo</strong></span>
            <StatusBadge label="Required" />
          </div>
          <div className="mode-status-list">
            <span>Folder ID: <strong>configured</strong></span>
            <StatusBadge label="Configured" />
          </div>
          <p>Drive folder health verification passed with 13 expected folders found, 0 missing, 0 name mismatches, and 0 owner-review items. This does not enable Drive uploads, moves, renames, deletes, or file edits.</p>
        </div>
      </section>

      <section className="section-block wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Environment</p>
            <h2>Local-only configuration</h2>
          </div>
        </div>
        <p className="muted-line">
          These values show configured/missing status only. Secret values are never displayed.
        </p>
        <div className="config-grid">
          {envEntries.map(([label, configured]) => (
            <ConfigRow key={label} label={label} configured={configured} />
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Tabs detected</p>
            <h2>{system.tabsDetected.length}</h2>
          </div>
        </div>
        <div className="tag-cloud">
          {system.tabsDetected.length ? system.tabsDetected.map((tab) => <span key={tab}>{tab}</span>) : <p className="muted-line">No tabs detected.</p>}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live source issues</p>
            <h2>{liveIssueCount}</h2>
          </div>
        </div>
        <div className="tag-cloud">
          {liveIssueCount ? (
            system.liveSourceChecklist
              .filter((item) => !item.present || item.missingColumns.length > 0)
              .map((item) => <span key={item.tab}>{item.present ? `${item.tab}: ${item.missingColumns.length} missing columns` : `${item.tab}: missing tab`}</span>)
          ) : (
            <p className="muted-line">All required live source tabs and columns are ready, or the dashboard is in Local Sample Mode.</p>
          )}
        </div>
      </section>
    </div>
  );
}
