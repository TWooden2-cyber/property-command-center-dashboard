"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FolderCheck, ShieldCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
import { DRIVE_READONLY_TARGET_FOLDER_ID, DRIVE_READONLY_TARGET_FOLDER_NAME } from "@/lib/googleDriveReadonlyConfig";
import {
  type DriveReadonlyMetadata,
  type DriveReadonlyStatus
} from "@/lib/googleDriveReadonly";

type ApiPayload = {
  ok: boolean;
  mode: string;
  status: DriveReadonlyStatus;
};

type HealthRow = {
  id: string;
  folder: string;
  status: string;
  note: string;
};

type CommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  prompt: string;
};

const expectedFolders = [
  "00 Command Dashboard",
  "01 Rent Collection",
  "02 Maintenance",
  "03 Mortgage and Arrears",
  "04 Notices and Legal Holds",
  "05 Utilities",
  "06 Lease Violations",
  "07 Tenant Communications",
  "08 Vendor Communications",
  "09 Weekly Command Reviews",
  "10 Proof Archive",
  "11 Source Data Exports",
  "12 Owner Approvals"
];

const commands: CommandTemplate[] = [
  {
    id: "preflight",
    title: "Codex Command - Drive Read-Only Preflight",
    actionName: "Generate Codex Command: Drive Read-Only Preflight",
    prompt: `Run Google Drive Read-Only Preflight for the Property Command Center.

Rules:
- Read-only/listing only.
- Do not upload, move, rename, delete, create, edit, or update Drive files or folders.
- Do not read file contents.
- Do not print tokens or secrets.
- Confirm credentials and token are outside the repo.
- Confirm scope is metadata/read-only only.
- Confirm target folder ID is configured.
- Run local preflight script.
- Report PASS/FAIL and stop before OAuth exchange or live write actions.`
  },
  {
    id: "listing",
    title: "Codex Command - Drive Read-Only Folder Listing",
    actionName: "Generate Codex Command: Drive Read-Only Folder Listing",
    prompt: `Run Google Drive Read-Only Folder Listing for the Property Command Center.

Rules:
- Metadata listing only.
- Do not download or read file contents.
- Do not upload, move, rename, delete, create, edit, or update anything in Drive.
- List only safe metadata for the configured Property Management Operating System folder.
- Compare returned folders to the expected proof-folder plan.
- Report missing folders and next owner actions.
- Stop before any Drive write actions.`
  },
  {
    id: "health",
    title: "Codex Command - Drive Folder Health Review",
    actionName: "Generate Codex Command: Drive Folder Health Review",
    prompt: `Prepare a Drive Folder Health Review.

Rules:
- Do not modify Drive.
- Review the expected folder structure against read-only listing results.
- Mark folders as Found, Missing, Not Checked, or Needs Owner Review.
- Produce a folder health report.
- Stop before live writes.`
  },
  {
    id: "token",
    title: "Codex Command - Drive Token Safety Audit",
    actionName: "Generate Codex Command: Drive Token Safety Audit",
    prompt: `Run a Drive Token Safety Audit.

Rules:
- Do not print token or credential contents.
- Confirm token and credentials are outside the repo.
- Confirm no secrets are committed.
- Confirm scopes are read-only only.
- Confirm no write scopes or Drive mutation code exists.
- Stop and report any risk.`
  },
  {
    id: "report",
    title: "Codex Command - Drive Read-Only Integration Report",
    actionName: "Generate Codex Command: Drive Read-Only Integration Report",
    prompt: `Prepare a Drive Read-Only Integration Report.

Rules:
- Read-only only.
- Summarize preflight result, scope safety, token storage, target folder, folder listing status, missing folders, blocked actions, and owner next steps.
- Do not perform Drive writes.`
  }
];

function toneForStatus(status: string) {
  if (status === "Found") return "green";
  if (status === "Missing") return "red";
  return "yellow";
}

export function DriveReadonlyView() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [activeCommand, setActiveCommand] = useState<CommandTemplate | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/drive-readonly", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: ApiPayload) => {
        if (mounted) setPayload(data);
      })
      .catch(() => {
        if (mounted) {
          setPayload({
            ok: false,
            mode: "safe-error",
            status: {
              connected: false,
              disabled: true,
              reason: "Drive read-only status could not be checked safely.",
              targetFolderId: DRIVE_READONLY_TARGET_FOLDER_ID,
              targetFolderName: DRIVE_READONLY_TARGET_FOLDER_NAME,
              credentialsPathSafe: true,
              tokenPathSafe: true,
              credentialsPresent: false,
              tokenPresent: false,
              scopeSafe: false,
              scopeStatus: "Not checked",
              lastLocalCheck: new Date().toISOString(),
              items: []
            }
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const status = payload?.status;
  const folderNames = useMemo(() => new Set((status?.items || []).map((item) => item.name)), [status?.items]);
  const healthRows: HealthRow[] = useMemo(() => {
    const connected = Boolean(status?.connected);
    return [
      { id: "main", folder: "Main folder", status: connected ? "Found" : "Not Checked", note: status?.reason || "Waiting for local preflight." },
      ...expectedFolders.map((folder) => ({
        id: folder,
        folder,
        status: connected ? (folderNames.has(folder) ? "Found" : "Missing") : "Not Checked",
        note: connected ? (folderNames.has(folder) ? "Read-only metadata returned." : "Needs owner review; do not create automatically.") : "Run local preflight and listing first."
      }))
    ];
  }, [folderNames, status?.connected, status?.reason]);

  const metadataColumns: DataTableColumn<DriveReadonlyMetadata>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "mimeType", header: "MIME Type", render: (row) => row.mimeType },
    { key: "modifiedTime", header: "Modified", render: (row) => row.modifiedTime || "Not available" },
    { key: "size", header: "Size", render: (row) => row.size || "Folder / not available" },
    { key: "webViewLink", header: "View Link", render: (row) => (row.webViewLink ? "Metadata link available" : "Not available") }
  ];
  const healthColumns: DataTableColumn<HealthRow>[] = [
    { key: "folder", header: "Folder", render: (row) => row.folder },
    { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
    { key: "note", header: "Notes", render: (row) => row.note }
  ];

  async function copyCommand(command: CommandTemplate) {
    const ok = await copyTextToClipboard(command.prompt);
    setCopied(ok ? command.id : null);
  }

  if (!payload) {
    return <LoadingState label="Checking Drive read-only status..." />;
  }

  return (
    <div className="remaining-command-page">
      <section className="remaining-command-header">
        <div>
          <span className="eyebrow">Local Sample Mode + Read-Only Drive Integration</span>
          <h2>Google Drive Read-Only Command</h2>
          <p>Read-only proof-folder listing, folder health review, and safe Drive integration status.</p>
        </div>
        <div className="remaining-header-stack">
          <StatusBadge label={status?.connected ? "Connected locally / read-only" : "Not connected / token missing or disabled"} />
          <StatusBadge label={`Target folder ID: ${DRIVE_READONLY_TARGET_FOLDER_ID}`} />
          <StatusBadge label="No Drive writes / no file contents read" />
        </div>
      </section>

      <section className="remaining-kpi-grid">
        {[
          ["Target Folder", DRIVE_READONLY_TARGET_FOLDER_NAME, "Configured folder", "green"],
          ["Connection Status", status?.connected ? "Connected" : "Not connected", status?.reason || "Safe fallback", status?.connected ? "green" : "yellow"],
          ["Token Location", status?.tokenPathSafe ? "Outside repo" : "Unsafe", status?.tokenPresent ? "Token present" : "Token missing", status?.tokenPathSafe ? "green" : "red"],
          ["Scope Status", status?.scopeSafe ? "Read-only" : "Not verified", status?.scopeStatus || "No scope checked", status?.scopeSafe ? "green" : "yellow"],
          ["Write Access", "Disabled", "No upload/move/rename/delete/edit", "green"],
          ["Last Local Check", status?.lastLocalCheck || "Not checked", "Safe status endpoint", "yellow"],
          ["Listed Items", String(status?.items.length || 0), "Safe metadata only", status?.items.length ? "green" : "yellow"],
          ["Next Owner Action", status?.connected ? "Review folder health" : "Run local preflight", "Stop before writes", "yellow"]
        ].map(([label, value, helper, tone]) => (
          <article className={`kpi-card status-strip ${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{helper}</small>
          </article>
        ))}
      </section>

      <section className="remaining-health-panel">
        <span className="eyebrow">Read-Only Safety Rules</span>
        <h3>Metadata listing only</h3>
        <div className="remaining-safety-strip">
          {["No file content read", "No upload", "No move", "No rename", "No delete", "No permission changes", "Token outside repo", "Owner approval required for future writes"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="remaining-queue-grid">
        <article className="remaining-queue-card queue-green">
          <FolderCheck size={19} />
          <h3>Target Folder Preview</h3>
          <p>Expected proof-folder structure. Preview only; no folders are created.</p>
          <div className="calendar-mini-list">
            <div><strong>{DRIVE_READONLY_TARGET_FOLDER_NAME}/</strong></div>
            {expectedFolders.map((folder) => <div key={folder}><strong>{folder}</strong></div>)}
          </div>
        </article>
        <article className="remaining-queue-card queue-red">
          <ShieldCheck size={19} />
          <h3>Blocked Until Verified</h3>
          <p>Drive writes and file content reads remain blocked.</p>
          <div className="calendar-mini-list">
            {["Do not enable Drive writes", "Do not upload proof files", "Do not create missing folders automatically", "Do not rename or move files", "Do not read file contents", "Do not store token in repo", "Do not expose Drive data publicly"].map((item) => (
              <div key={item}><strong>{item}</strong></div>
            ))}
          </div>
        </article>
        <article className="remaining-queue-card queue-yellow">
          <Copy size={19} />
          <h3>Next Actions</h3>
          <p>Local owner workflow before any future write discussion.</p>
          <div className="calendar-mini-list">
            {["Run local preflight", "Confirm read-only scope", "Confirm token outside repo", "Run read-only folder listing", "Compare folder listing to proof-folder plan", "Mark missing folders as needs owner review", "Stop before any Drive write action"].map((item) => (
              <div key={item}><strong>{item}</strong></div>
            ))}
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live Listing Results</p>
            <h2>{status?.connected ? "Read-only metadata returned" : "Read-only Drive listing not connected yet"}</h2>
          </div>
        </div>
        {status?.items.length ? <DataTable rows={status.items} columns={metadataColumns} /> : <EmptyState title="No live Drive metadata displayed" message={status?.reason || "Run local preflight and listing after owner-approved token setup."} />}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Folder Health Checklist</p>
            <h2>Proof folder status</h2>
          </div>
        </div>
        <DataTable rows={healthRows.map((row) => ({ ...row, id: `${row.id}-${row.status}` }))} columns={healthColumns} />
      </section>

      <section className="calendar-command-panel">
        <span className="eyebrow">Draft Command Buttons</span>
        <h3>Drive Read-Only Commands</h3>
        <p>These buttons prepare commands only. They do not connect OAuth, list Drive, or perform any Drive action from the browser.</p>
        <div className="remaining-command-button-grid">
          {commands.map((command) => (
            <article className="codex-command-card command-tone-yellow" key={command.id}>
              <span>Read-only only</span>
              <strong>{command.actionName}</strong>
              <p>No Drive writes, no upload, no move, no rename, no delete, no file content read.</p>
              <button type="button" onClick={() => setActiveCommand(command)}>
                <Copy size={15} />
                Generate Command
              </button>
            </article>
          ))}
        </div>
        {activeCommand ? (
          <div className="remaining-command-preview command-preview-panel">
            <div className="command-preview-header">
              <div>
                <span className="eyebrow">Command Preview</span>
                <h3>{activeCommand.title}</h3>
              </div>
              <button type="button" onClick={() => setActiveCommand(null)}>Close</button>
            </div>
            <div className="command-preview-labels">
              {["Read-only only", "Owner approval required", "No Drive writes", "No upload", "No move", "No rename", "No delete", "No file content read", "Token outside repo"].map((label) => <span key={label}>{label}</span>)}
            </div>
            <pre>{activeCommand.prompt}</pre>
            <div className="command-preview-actions">
              <button type="button" onClick={() => copyCommand(activeCommand)}>
                <Copy size={15} />
                Copy Command
              </button>
              {copied === activeCommand.id ? <span>Copied command to clipboard.</span> : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
