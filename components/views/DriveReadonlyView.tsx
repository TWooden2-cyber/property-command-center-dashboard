"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FolderCheck, FolderKanban, ShieldCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState, LoadingState } from "@/components/DataState";
import { StatusBadge } from "@/components/StatusBadge";
import type { GoogleProductStatus } from "@/types/googleProducts";
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
  ok?: boolean;
  mode?: string;
  status?: DriveReadonlyStatus;
  error?: string;
};

type ProductPayload = {
  ok?: boolean;
  status?: GoogleProductStatus;
  error?: string;
};

type DriveProductDetails = {
  rootFolderFound?: boolean;
  folderName?: string;
  folderId?: string;
  visibleFolderCount?: number;
  keyFoldersFound?: string[];
  missingKeyFolders?: string[];
  recentIntakeCount?: number | null;
};

type KpiConfig = {
  label: string;
  value: string;
  helper: string;
  tone: "green" | "yellow" | "red";
};

function fallbackDriveStatus(reason: string): DriveReadonlyStatus {
  return {
    connected: false,
    disabled: true,
    reason,
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
  };
}

async function fetchJson<T>(url: string): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json()) as T;
    return {
      ok: response.ok,
      data,
      error: response.ok ? null : `${response.status} ${response.statusText}`
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: error instanceof Error ? error.message : "Request failed"
    };
  }
}

function driveDetails(status?: GoogleProductStatus | null): DriveProductDetails {
  return (status?.details ?? {}) as DriveProductDetails;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not checked";
  return new Date(value).toLocaleString();
}

export function DriveReadonlyView() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [productStatus, setProductStatus] = useState<GoogleProductStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDriveSystem() {
      const [listingResult, productResult] = await Promise.all([
        fetchJson<ApiPayload>("/api/drive-readonly"),
        fetchJson<ProductPayload>("/api/google/drive/status")
      ]);

      if (!mounted) return;

      const listingPayload = listingResult.data?.status
        ? listingResult.data
        : {
            ok: false,
            mode: "safe-error",
            status: fallbackDriveStatus(listingResult.error || "Drive read-only status could not be checked safely.")
          };

      setPayload(listingPayload);
      setProductStatus(productResult.data?.status ?? null);
      setLoadError(!listingResult.ok && !productResult.ok ? productResult.error || listingResult.error || "Drive system status could not be loaded." : null);
    }

    loadDriveSystem();

    return () => {
      mounted = false;
    };
  }, []);

  const status = payload?.status;
  const productDetails = useMemo(() => driveDetails(productStatus), [productStatus]);
  const productConnected = Boolean(productStatus?.connected);
  const localListingConnected = Boolean(status?.connected && status.items.length);
  const connected = productConnected || Boolean(status?.connected);
  const rootFolderName = productDetails.folderName || DRIVE_READONLY_TARGET_FOLDER_NAME;
  const rootFolderId = productDetails.folderId || DRIVE_READONLY_TARGET_FOLDER_ID;
  const keyFoldersFound = productDetails.keyFoldersFound || [];
  const missingKeyFolders = productDetails.missingKeyFolders || [];
  const visibleFolderCount = typeof productDetails.visibleFolderCount === "number" ? productDetails.visibleFolderCount : null;
  const recentIntakeCount = typeof productDetails.recentIntakeCount === "number" ? productDetails.recentIntakeCount : null;
  const lastChecked = productStatus?.checkedAt || status?.lastLocalCheck || null;
  const statusMessage = productStatus?.message || status?.reason || loadError || "Drive status not checked.";
  const folderHealth = useMemo(
    () => buildDriveFolderHealthMap(status?.items || [], Boolean(status?.connected)),
    [status?.items, status?.connected]
  );
  const futureActions = useMemo(() => buildDriveFutureActionPreview(folderHealth.rows), [folderHealth.rows]);
  const foundFolderCount = localListingConnected ? folderHealth.summary.found : keyFoldersFound.length;
  const missingFolderCount = localListingConnected ? folderHealth.summary.missing : missingKeyFolders.length;
  const kpis: KpiConfig[] = [
    {
      label: "Drive Status",
      value: connected ? "Live" : "Review",
      helper: productConnected ? "Production read-only metadata" : status?.scopeStatus || "Connection check pending",
      tone: connected ? "green" : "yellow"
    },
    {
      label: "Visible Folders",
      value: visibleFolderCount === null ? String(status?.items.length || 0) : String(visibleFolderCount),
      helper: productConnected ? "Root folder child folders" : "Local metadata listing",
      tone: connected ? "green" : "yellow"
    },
    {
      label: "Key Folders Found",
      value: String(foundFolderCount),
      helper: localListingConnected ? "Expected proof-folder matches" : "Production key-folder matches",
      tone: foundFolderCount > 0 ? "green" : connected ? "yellow" : "red"
    },
    {
      label: "Missing / Review",
      value: String(missingFolderCount + folderHealth.summary.nameMismatch + folderHealth.summary.needsOwnerReview),
      helper: "Owner-reviewed future package only",
      tone: missingFolderCount || folderHealth.summary.nameMismatch || folderHealth.summary.needsOwnerReview ? "yellow" : "green"
    },
    {
      label: "Intake Queue",
      value: recentIntakeCount === null ? "N/A" : String(recentIntakeCount),
      helper: "Property Management Intake children",
      tone: recentIntakeCount && recentIntakeCount > 0 ? "yellow" : "green"
    },
    {
      label: "Drive Writes",
      value: "Blocked",
      helper: "No create, upload, move, rename, delete, or share",
      tone: "green"
    },
    {
      label: "Local Listing",
      value: status?.connected ? "Ready" : "Safe",
      helper: status?.reason || "Metadata-only route",
      tone: status?.connected ? "green" : "yellow"
    },
    {
      label: "Last Check",
      value: formatDateTime(lastChecked),
      helper: productStatus?.mode || payload?.mode || "Read-only status",
      tone: connected ? "green" : "yellow"
    }
  ];

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


  if (!payload && !productStatus && !loadError) {
    return <LoadingState label="Checking Drive read-only status..." />;
  }

  return (
    <div className="remaining-command-page drive-system-page">
      <section className="remaining-command-header drive-system-header">
        <div>
          <span className="eyebrow">Google Drive System</span>
          <h2>{connected ? "Drive operating folder is visible" : "Drive connection needs review"}</h2>
          <p>{statusMessage}</p>
        </div>
        <div className="remaining-header-stack">
          <StatusBadge label={productConnected ? "Production read-only live" : status?.connected ? "Local listing live" : "Connection review"} />
          <StatusBadge label={`Root: ${rootFolderName}`} />
          <StatusBadge label="Drive writes disabled" />
        </div>
      </section>

      <section className="remaining-kpi-grid">
        {kpis.map(({ label, value, helper, tone }) => (
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
            <p className="eyebrow">Production Drive Snapshot</p>
            <h2>Root folder and key-folder status</h2>
          </div>
          <StatusBadge label="Metadata only" />
        </div>
        <div className="drive-system-snapshot-grid">
          {[
            ["Root folder name", rootFolderName],
            ["Root folder ID", rootFolderId],
            ["Root folder found", productDetails.rootFolderFound ? "Yes" : productConnected ? "Checked" : "Not verified"],
            ["Connected account", productStatus?.connectedAccountEmail || "Not available"],
            ["Product status", productStatus?.status || "Not checked"],
            ["Token status", productStatus?.tokenExpirationStatus || "Not available"],
            ["Last production check", formatDateTime(productStatus?.checkedAt)],
            ["Status message", productStatus?.message || loadError || "Not checked"]
          ].map(([label, value]) => (
            <div className="mode-status-list" key={label}>
              <span>{label}: <strong>{value}</strong></span>
              <StatusBadge label={value} />
            </div>
          ))}
        </div>
        <div className="drive-folder-chip-grid">
          <article>
            <FolderKanban size={18} aria-hidden />
            <span>Found key folders</span>
            <strong>{keyFoldersFound.length ? keyFoldersFound.join(", ") : "No production folder list available"}</strong>
          </article>
          <article>
            <ShieldCheck size={18} aria-hidden />
            <span>Missing or needs review</span>
            <strong>{missingKeyFolders.length ? missingKeyFolders.join(", ") : "No missing key folders reported"}</strong>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Local Drive Listing Summary</p>
            <h2>Metadata route status</h2>
          </div>
          <StatusBadge label={payload?.mode || "safe-status"} />
        </div>
        <div className="settings-lines">
          {[
            ["Target folder name", status?.targetFolderName || DRIVE_READONLY_TARGET_FOLDER_NAME],
            ["Target folder ID", status?.targetFolderId || DRIVE_READONLY_TARGET_FOLDER_ID],
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
          <FolderCheck size={19} />
          <h3>Next Actions</h3>
          <p>Owner workflow before any future write discussion.</p>
          <div className="calendar-mini-list">
            {["Check production Drive status", "Confirm read-only scope", "Confirm token stays outside repo", "Run local metadata listing when needed", "Compare folder listing to proof-folder plan", "Mark missing folders as needs owner review", "Stop before any Drive write action"].map((item) => (
              <div key={item}><strong>{item}</strong></div>
            ))}
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Local Metadata Listing Results</p>
            <h2>{status?.connected ? "Read-only metadata returned" : "Local Drive listing not active"}</h2>
          </div>
        </div>
        {status?.items.length ? <DataTable rows={status.items} columns={metadataColumns} /> : <EmptyState title="No local Drive metadata displayed" message={productConnected ? "Production Drive status is live. The local folder listing route is optional and remains metadata-only." : status?.reason || "Run local preflight and listing after owner-approved token setup."} />}
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

      <section className="remaining-related-grid">
        <article className="remaining-queue-card queue-yellow">
          <ShieldCheck size={19} />
          <h3>Final Integration Package</h3>
          <p>Drive correction preview, recheck workflow, and manual vs future automation decision.</p>
          <Link href="/final-integration" className="summary-link-button">
            Open Final Integration
          </Link>
        </article>
      </section>

    </div>
  );
}
