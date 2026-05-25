export type DriveFolderHealthStatus = "Found" | "Missing" | "Name Mismatch" | "Needs Owner Review" | "Not Checked";
export type DriveFolderHealthTone = "green" | "yellow" | "red";

export type DriveFolderMetadataInput = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
};

export type DriveFolderHealthRow = {
  id: string;
  expectedFolder: string;
  actualMatch: string;
  status: DriveFolderHealthStatus;
  tone: DriveFolderHealthTone;
  driveItemType: string;
  modifiedTime: string;
  ownerAction: string;
  blockedAction: string;
  notes: string;
};

export type DriveFolderHealthSummary = {
  expectedFolders: number;
  found: number;
  missing: number;
  nameMismatch: number;
  needsOwnerReview: number;
  notChecked: number;
};

export type DriveFolderFutureAction = {
  id: string;
  actionType: string;
  target: string;
  status: string;
  ownerApproval: string;
  performed: string;
  notes: string;
};

export const EXPECTED_DRIVE_PROOF_FOLDERS = [
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
] as const;

const folderMimeType = "application/vnd.google-apps.folder";

const expectedFolderAliases: Record<string, string[]> = {
  "00 Command Dashboard": ["master tracker", "command dashboard", "dashboard snapshots"],
  "01 Rent Collection": ["rent collection"],
  "02 Maintenance": ["maintenance"],
  "03 Mortgage and Arrears": ["mortgage arrears", "mortgage", "arrears"],
  "04 Notices and Legal Holds": ["evictions and notices", "legal and compliance", "notices", "legal compliance"],
  "05 Utilities": ["utilities", "utility bills"],
  "06 Lease Violations": ["lease violations"],
  "07 Tenant Communications": ["tenant message library", "tenant communications"],
  "08 Vendor Communications": ["vendor info", "vendor communications"],
  "09 Weekly Command Reviews": ["monthly reports", "weekly reports", "weekly command reviews", "command reviews"],
  "10 Proof Archive": ["archived old versions", "archive", "proof archive"],
  "11 Source Data Exports": ["source data exports", "source exports", "data exports"],
  "12 Owner Approvals": ["owner approvals", "owner approval"]
};

function normalizeFolderName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/^\s*\d+\s*[-._]?\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(and|the|of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function itemLabel(items: DriveFolderMetadataInput[]) {
  if (!items.length) {
    return "No metadata match";
  }
  return items.map((item) => item.name).join("; ");
}

function itemType(items: DriveFolderMetadataInput[]) {
  if (!items.length) {
    return "Folder not found";
  }
  if (items.length > 1) {
    return "Multiple folder metadata matches";
  }
  return items[0].mimeType || "Unknown";
}

function itemModifiedTime(items: DriveFolderMetadataInput[]) {
  if (!items.length) {
    return "Not available";
  }
  if (items.length > 1) {
    return "Multiple";
  }
  return items[0].modifiedTime || "Not available";
}

function rowForStatus(
  expectedFolder: string,
  status: DriveFolderHealthStatus,
  matches: DriveFolderMetadataInput[],
  note: string
): DriveFolderHealthRow {
  const tone: DriveFolderHealthTone = status === "Found" ? "green" : status === "Missing" ? "red" : "yellow";
  const ownerAction =
    status === "Found"
      ? "No action"
      : status === "Missing"
        ? "Confirm if folder should exist"
        : status === "Name Mismatch"
          ? "Review folder name"
          : status === "Needs Owner Review"
            ? "Confirm expected folder mapping"
            : "Run local read-only listing";
  const blockedAction =
    status === "Found"
      ? "Do not delete automatically"
      : status === "Missing"
        ? "Do not create automatically"
        : status === "Name Mismatch"
          ? "Do not rename automatically"
          : status === "Needs Owner Review"
            ? "Do not move automatically"
            : "Do not perform Drive writes";

  return {
    id: `${expectedFolder}-${status}`,
    expectedFolder,
    actualMatch: itemLabel(matches),
    status,
    tone,
    driveItemType: itemType(matches),
    modifiedTime: itemModifiedTime(matches),
    ownerAction,
    blockedAction,
    notes: note
  };
}

export function buildDriveFolderHealthMap(items: DriveFolderMetadataInput[], connected: boolean) {
  const actualFolders = items.filter((item) => item.mimeType === folderMimeType);

  const rows = EXPECTED_DRIVE_PROOF_FOLDERS.map((expectedFolder) => {
    if (!connected) {
      return rowForStatus(expectedFolder, "Not Checked", [], "Run local preflight and metadata-only listing first.");
    }

    const expectedName = normalizeFolderName(expectedFolder);
    const exactMatches = actualFolders.filter((item) => normalizeFolderName(item.name) === expectedName);
    if (exactMatches.length) {
      return rowForStatus(expectedFolder, "Found", exactMatches, "Expected folder matched read-only Drive metadata.");
    }

    const aliases = (expectedFolderAliases[expectedFolder] || []).map(normalizeFolderName);
    const aliasMatches = actualFolders.filter((item) => aliases.includes(normalizeFolderName(item.name)));
    if (aliasMatches.length === 1) {
      return rowForStatus(
        expectedFolder,
        "Name Mismatch",
        aliasMatches,
        "Actual metadata name appears related but does not match the expected naming standard."
      );
    }
    if (aliasMatches.length > 1) {
      return rowForStatus(
        expectedFolder,
        "Needs Owner Review",
        aliasMatches,
        "Multiple actual folders could map to this expected folder; owner should choose before any future write package."
      );
    }

    return rowForStatus(
      expectedFolder,
      "Missing",
      [],
      "No matching folder metadata returned. Add to a future Drive write package only after owner approval."
    );
  });

  const summary: DriveFolderHealthSummary = {
    expectedFolders: EXPECTED_DRIVE_PROOF_FOLDERS.length,
    found: rows.filter((row) => row.status === "Found").length,
    missing: rows.filter((row) => row.status === "Missing").length,
    nameMismatch: rows.filter((row) => row.status === "Name Mismatch").length,
    needsOwnerReview: rows.filter((row) => row.status === "Needs Owner Review").length,
    notChecked: rows.filter((row) => row.status === "Not Checked").length
  };

  return { rows, summary };
}

export function buildDriveFutureActionPreview(rows: DriveFolderHealthRow[]): DriveFolderFutureAction[] {
  return rows
    .filter((row) => row.status !== "Found" && row.status !== "Not Checked")
    .map((row) => {
      const actionType =
        row.status === "Missing"
          ? "Create missing folder"
          : row.status === "Name Mismatch"
            ? "Rename mismatched folder"
            : "Resolve folder mapping";

      return {
        id: `${row.id}-future-action`,
        actionType,
        target: row.status === "Missing" ? row.expectedFolder : `${row.actualMatch} -> ${row.expectedFolder}`,
        status: "Not approved / blocked",
        ownerApproval: "Required",
        performed: "Not performed",
        notes:
          row.status === "Missing"
            ? "Could be added to a future Drive write package only after owner approval."
            : "Review before any future rename, move, archive, or package action."
      };
    });
}
