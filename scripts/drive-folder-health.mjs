import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const repoRoot = process.cwd();
const targetFolderId = "1200_qPBmBz6KHjZY59HTPMpvXTCt5bGt";
const readonlyScope = "https://www.googleapis.com/auth/drive.metadata.readonly";
const credentialsPath = "C:\\Users\\TRS_F\\.property-command\\google-drive\\credentials.json";
const tokenPath = "C:\\Users\\TRS_F\\.property-command\\google-drive\\token.json";
const folderMimeType = "application/vnd.google-apps.folder";
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
const aliases = {
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

function outsideRepo(filePath) {
  const relative = path.relative(repoRoot, filePath);
  return Boolean(relative) && (relative.startsWith("..") || path.isAbsolute(relative));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(message) {
  console.error(`SAFE STOP: ${message}`);
  process.exit(1);
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/^\s*\d+\s*[-._]?\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(and|the|of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function label(items) {
  return items.length ? items.map((item) => item.name).join("; ") : "No metadata match";
}

function modified(items) {
  if (!items.length) return "Not available";
  if (items.length > 1) return "Multiple";
  return items[0].modifiedTime || "Not available";
}

function row(expectedFolder, status, matches, notes) {
  return {
    expectedFolder,
    actualMatch: label(matches),
    status,
    driveItemType: matches.length > 1 ? "Multiple folder metadata matches" : matches[0]?.mimeType || "Folder not found",
    modifiedTime: modified(matches),
    ownerAction:
      status === "Found"
        ? "No action"
        : status === "Missing"
          ? "Confirm if folder should exist"
          : status === "Name Mismatch"
            ? "Review folder name"
            : "Confirm expected folder mapping",
    blockedAction:
      status === "Found"
        ? "Do not delete automatically"
        : status === "Missing"
          ? "Do not create automatically"
          : status === "Name Mismatch"
            ? "Do not rename automatically"
            : "Do not move automatically",
    notes
  };
}

function buildHealthRows(items) {
  const folders = items.filter((item) => item.mimeType === folderMimeType);

  return expectedFolders.map((expectedFolder) => {
    const expectedName = normalizeName(expectedFolder);
    const exact = folders.filter((item) => normalizeName(item.name) === expectedName);
    if (exact.length) {
      return row(expectedFolder, "Found", exact, "Expected folder matched read-only Drive metadata.");
    }

    const aliasNames = (aliases[expectedFolder] || []).map(normalizeName);
    const aliasMatches = folders.filter((item) => aliasNames.includes(normalizeName(item.name)));
    if (aliasMatches.length === 1) {
      return row(expectedFolder, "Name Mismatch", aliasMatches, "Related folder metadata returned, but the name does not match the standard.");
    }
    if (aliasMatches.length > 1) {
      return row(expectedFolder, "Needs Owner Review", aliasMatches, "Multiple actual folders could map here; owner must choose before any future write package.");
    }

    return row(expectedFolder, "Missing", [], "No matching folder metadata returned. Do not create automatically.");
  });
}

if (!outsideRepo(credentialsPath) || !outsideRepo(tokenPath)) fail("credentials/token path must stay outside repo.");
if (!fs.existsSync(credentialsPath)) fail("credentials file missing outside repo.");
if (!fs.existsSync(tokenPath)) fail("token file missing outside repo.");

const credentials = readJson(credentialsPath);
const token = readJson(tokenPath);
const scopes = String(token.scope || "").split(/\s+/).filter(Boolean);
const unsafeScopes = scopes.filter((scope) => scope.startsWith("https://www.googleapis.com/auth/") && scope !== readonlyScope);
if (!scopes.includes(readonlyScope) || unsafeScopes.length) {
  fail("token scope is not metadata/read-only only, or unrelated Google API scopes are present.");
}

const cfg = credentials.installed || credentials.web;
if (!cfg?.client_id || !cfg?.client_secret) fail("OAuth client fields missing.");

const auth = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, cfg.redirect_uris?.[0]);
auth.setCredentials(token);
const drive = google.drive({ version: "v3", auth });

await drive.files.get({ fileId: targetFolderId, fields: "id,name,mimeType,modifiedTime,webViewLink" });
const response = await drive.files.list({
  q: `'${targetFolderId}' in parents and trashed = false`,
  pageSize: 100,
  fields: "files(id,name,mimeType,parents,modifiedTime,webViewLink,size)",
  orderBy: "folder,name"
});

const items = response.data.files || [];
const healthRows = buildHealthRows(items);
const summary = {
  expectedFolders: expectedFolders.length,
  found: healthRows.filter((item) => item.status === "Found").length,
  missing: healthRows.filter((item) => item.status === "Missing").length,
  nameMismatch: healthRows.filter((item) => item.status === "Name Mismatch").length,
  needsOwnerReview: healthRows.filter((item) => item.status === "Needs Owner Review").length,
  notChecked: healthRows.filter((item) => item.status === "Not Checked").length
};

console.log("Drive folder health report. Metadata only. No file contents read. No Drive writes performed.");
console.log(`Target folder ID: ${targetFolderId}`);
console.log(`Items listed: ${items.length}`);
console.table(healthRows);
console.table([summary]);
