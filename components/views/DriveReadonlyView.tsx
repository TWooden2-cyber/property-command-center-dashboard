"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FolderCheck, ShieldCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  EXPECTED_DRIVE_PROOF_FOLDERS,
  buildDriveFolderHealthMap,
  buildDriveFutureActionPreview,
  type DriveFolderFutureAction,
  type DriveFolderHealthRow
} from "@/lib/driveFolderHealth";
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

type CommandTemplate = {
  id: string;
  title: string;
  actionName: string;
  prompt: string;
};

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
    id: "folder-health-mapping",
    title: "Codex Command - Drive Folder Health Mapping",
    actionName: "Generate Codex Command: Drive Folder Health Mapping",
    prompt: `Run Drive Folder Health Mapping.

Rules:
- Use metadata-only Drive read-only listing.
- Do not create, upload, move, rename, delete, edit, copy, trash, or change permissions.
- Do not read file contents.
- Compare expected proof folders to actual listed Drive metadata.
- Mark folders as Found, Missing, Name Mismatch, Needs Owner Review, or Not Checked.
- Produce a folder health report.
- Stop before Drive write actions.`
  },
  {
    id: "missing-folder-review",
    title: "Codex Command - Missing Folder Review",
    actionName: "Generate Codex Command: Missing Folder Review",
    prompt: `Prepare a Missing Folder Review.

Rules:
- Do not create folders.
- Do not update Drive.
- Identify expected proof folders that are missing from the read-only listing.
- Explain why each folder may be needed.
- Prepare owner decision list for possible future Drive write package.
- Stop before live writes.`
  },
  {
    id: "write-package-preview",
    title: "Codex Command - Drive Write Package Preview",
    actionName: "Generate Codex Command: Drive Write Package Preview",
    prompt: `Prepare a Drive Write Package Preview.

Rules:
- Preview only.
- Do not create, upload, move, rename, delete, edit, copy, trash, or change permissions.
- List potential future Drive actions separately from completed actions.
- Mark all actions as not approved and blocked until owner approval.
- Stop before Drive writes.`
  },
  {
    id: "folder-naming-review",
    title: "Codex Command - Drive Folder Naming Review",
    actionName: "Generate Codex Command: Drive Folder Naming Review",
    prompt: `Prepare a Drive Folder Naming Review.

Rules:
- Do not rename folders.
- Do not update Drive.
- Compare actual folder names to expected naming standard.
- Identify possible mismatches and owner decisions required.
- Stop before Drive writes.`
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
  const folderHealth = useMemo(
    () => buildDriveFolderHealthMap(status?.items || [], Boolean(status?.connected)),
    [status?.items, status?.connected]
  );
  const futureActions = useMemo(() => buildDriveFutureActionPreview(folderHealth.rows), [folderHealth.rows]);

  const metadataColumns: DataTableColumn<DriveReadonlyMetadata>[] = [
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "mimeType", header: "MIME Type", render: (row) => row.mimeType },
    { key: "modifiedTime", header: "Modified", render: (row) => row.modifiedTime || "Not available" },
    { key: "size", header: "Size", render: (row) => row.size || "Folder / not available" },
    { key: "webViewLink", header: "View Link", render: (row) => (row.webViewLink ? "Metadata link available" : "Not available") }
  ];
  const healthColumns: DataTableColumn<DriveFolderHealthRow>[] = [
    { key: "expectedFolder", header: "Expected Folder", render: (row) => row.expectedFolder },
    { key: "actualMatch", header: "Actual Match", render: (row) => row.actualMatch },
    { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
    { key: "driveItemType", header: "Drive Item Type", render: (row) => row.driveItemType },
    { key: "modifiedTime", header: "Modified Time", render: (row) => row.modifiedTime },
    { key: "ownerAction", header: "Owner Action", render: (row) => row.ownerAction },
    { key: "blockedAction", header: "Blocked Action", render: (row) => row.blockedAction },
    { key: "notes", header: "Notes", render: (row) => row.notes }
  ];
  const futureActionColumns: DataTableColumn<DriveFolderFutureAction>[] = [
    { key: "actionType", header: "Potential Future Action", render: (row) => row.actionType },
    { key: "target", header: "Target", render: (row) => row.target },
    { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
    { key: "ownerApproval", header: "Owner Approval", render: (row) => row.ownerApproval },
    { key: "performed", header: "Performed", render: (row) => row.performed },
    { key: "notes", header: "Notes", render: (row) => row.notes }
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
          ["Expected Folders", String(folderHealth.summary.expectedFolders), "Proof-folder standard", "green"],
          ["Found", String(folderHealth.summary.found), "Exact metadata match", "green"],
          ["Missing", String(folderHealth.summary.missing), "Future write package only after approval", folderHealth.summary.missing ? "red" : "green"],
          ["Name Mismatch", String(folderHealth.summary.nameMismatch), "Review naming before any future rename", folderHealth.summary.nameMismatch ? "yellow" : "green"],
          ["Needs Owner Review", String(folderHealth.summary.needsOwnerReview), "Ambiguous folder mapping", folderHealth.summary.needsOwnerReview ? "yellow" : "green"],
          ["Read-Only Status", status?.connected ? "Active" : "Not connected", status?.scopeStatus || "Metadata-read-only only", status?.connected ? "green" : "yellow"],
          ["Drive Writes", "Disabled", "No create/upload/move/rename/delete/edit/copy/trash/permissions", "green"],
          ["Last Listing Result", status?.connected ? "Metadata listed" : "Not checked", status?.reason || "Safe status endpoint", status?.connected ? "green" : "yellow"]
        ].map(([label, value, helper, tone]) => (
          <article className={`kpi-card status-strip ${tone}`} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{helper}</small>
          </article>
        ))}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Drive Listing Summary</p>
            <h2>Target folder metadata status</h2>
          </div>
          <StatusBadge label="Metadata only" />
        </div>
        <div className="settings-lines">
          {[
            ["Target folder name", DRIVE_READONLY_TARGET_FOLDER_NAME],
            ["Target folder ID", DRIVE_READONLY_TARGET_FOLDER_ID],
            ["Items listed", String(status?.items.length || 0)],
            ["Listing mode", "Metadata only"],
            ["File contents read", "No"],
            ["Drive writes performed", "No"],
            ["Last local listing status", status?.reason || "Not checked"],
            ["Token location", status?.tokenPathSafe ? "Outside repo" : "Unsafe / blocked"],
            ["Scope", status?.scopeStatus || "metadata-read-only only"]
          ].map(([label, value]) => (
            <div className="mode-status-list" key={label}>
              <span>{label}: <strong>{value}</strong></span>
              <StatusBadge label={value} />
            </div>
          ))}
        </div>
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
            {EXPECTED_DRIVE_PROOF_FOLDERS.map((folder) => <div key={folder}><strong>{folder}</strong></div>)}
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
            <p className="eyebrow">Drive Folder Health Mapping</p>
            <h2>Expected folders vs actual Drive metadata</h2>
          </div>
        </div>
        <DataTable rows={folderHealth.rows} columns={healthColumns} />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Future Drive Write Package Preview</p>
            <h2>Potential future Drive folder actions</h2>
          </div>
          <StatusBadge label="Not approved / blocked" />
        </div>
        {futureActions.length ? (
          <DataTable rows={futureActions} columns={futureActionColumns} />
        ) : (
          <EmptyState title="No future Drive folder actions suggested" message="Folder health currently has no missing, mismatched, or owner-review rows." />
        )}
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
              <p>No Drive writes, no folder creation, no upload, no move, no rename, no delete, no file content read.</p>
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
              {["Read-only only", "Owner approval required", "No Drive writes", "No folder creation", "No rename", "No move", "No delete", "No file content read"].map((label) => <span key={label}>{label}</span>)}
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
