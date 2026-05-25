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
  const envEntries = [
    ["GOOGLE_SERVICE_ACCOUNT_EMAIL", system.env.googleServiceAccountEmail],
    ["GOOGLE_PRIVATE_KEY", system.env.googlePrivateKey],
    ["GOOGLE_SHEET_ID", system.env.googleSheetId],
    ["GOOGLE_CLIENT_ID", system.env.googleClientId],
    ["GOOGLE_CLIENT_SECRET", system.env.googleClientSecret],
    ["AUTH_SECRET / NEXTAUTH_SECRET", system.env.nextAuthSecret],
    ["AUTH_URL / NEXTAUTH_URL", system.env.nextAuthUrl],
    ["ALLOWED_OWNER_EMAILS", system.env.allowedOwnerEmails]
  ] as const;

  return (
    <div className="settings-grid">
      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">System Mode</p>
            <h2>Local Sample Mode</h2>
          </div>
          <Database size={20} aria-hidden />
        </div>
        <div className="settings-lines">
          <p>{system.connectionMessage}</p>
          <p>This dashboard is using local sample records only. Auth environment variables are required in production and fail closed when missing.</p>
          <div className="mode-status-list">
            <span>Mode: <strong>Local Sample Mode</strong></span>
            <StatusBadge label="Stable" />
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
            <span>Login Provider: <strong>Google</strong></span>
            <StatusBadge label="Google" />
          </div>
          <div className="mode-status-list">
            <span>Allowed Owner Emails: <strong>{system.env.allowedOwnerEmails ? `${system.auth.allowedOwnerEmailCount ?? 0} configured` : "Missing"}</strong></span>
            <StatusBadge label={system.env.allowedOwnerEmails ? "Configured" : "Missing"} />
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
            <span>Live Actions: <strong>Still Disabled</strong></span>
            <StatusBadge label="Disabled" />
          </div>
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
            <span>Status: <strong>Planned / Local read-only</strong></span>
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
          <p>Owner approval is required before any future Drive write action. This does not enable Drive uploads, moves, renames, deletes, or file edits.</p>
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
          These values show configured/missing status only. Secret values and allowed email addresses are never displayed.
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
            <p className="eyebrow">Missing tabs</p>
            <h2>{system.missingTabs.length}</h2>
          </div>
        </div>
        <div className="tag-cloud">
          {system.missingTabs.length ? system.missingTabs.map((tab) => <span key={tab}>{tab}</span>) : <p className="muted-line">All source tabs detected.</p>}
        </div>
      </section>
    </div>
  );
}
