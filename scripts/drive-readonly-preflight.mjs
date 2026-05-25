import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const repoRoot = process.cwd();
const targetFolderId = "1200_qPBmBz6KHjZY59HTPMpvXTCt5bGt";
const readonlyScope = "https://www.googleapis.com/auth/drive.metadata.readonly";
const credentialsPath = "C:\\Users\\TRS_F\\.property-command\\google-drive\\credentials.json";
const tokenPath = "C:\\Users\\TRS_F\\.property-command\\google-drive\\token.json";
const unsafeScopes = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.readonly"
];

function outsideRepo(filePath) {
  const relative = path.relative(repoRoot, filePath);
  return Boolean(relative) && (relative.startsWith("..") || path.isAbsolute(relative));
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function scopeCheck(scope) {
  if (!scope) return { pass: false, detail: "Token scope missing; listing disabled until a read-only token is confirmed." };
  const scopes = scope.split(/\s+/).filter(Boolean);
  if (!scopes.includes(readonlyScope)) return { pass: false, detail: "metadata/read-only scope missing." };
  const unsafe = scopes.filter(
    (scopeValue) =>
      (unsafeScopes.includes(scopeValue) && scopeValue !== readonlyScope) ||
      (scopeValue.startsWith("https://www.googleapis.com/auth/") && scopeValue !== readonlyScope)
  );
  if (unsafe.length) return { pass: false, detail: "Unsafe Drive scope detected; refusing to run." };
  return { pass: true, detail: "metadata/read-only scope only." };
}

const rows = [];
function add(check, pass, detail) {
  rows.push({ check, result: pass ? "PASS" : "FAIL", detail });
}

const credentialsSafe = outsideRepo(credentialsPath);
const tokenSafe = outsideRepo(tokenPath);
const credentialsPresent = exists(credentialsPath);
const tokenPresent = exists(tokenPath);
add("Credentials path outside repo", credentialsSafe, credentialsSafe ? "Safe external path." : "Unsafe path inside repo.");
add("Token path outside repo", tokenSafe, tokenSafe ? "Safe external path." : "Unsafe path inside repo.");
add("Credentials file present", credentialsPresent, credentialsPresent ? "Credentials file found outside repo." : "Missing; no OAuth exchange attempted.");
add("Token file present", tokenPresent, tokenPresent ? "Token file found outside repo." : "Missing; read-only listing not connected.");
add("Target folder configured", Boolean(targetFolderId), targetFolderId);

let scope = "";
if (tokenPresent) {
  try {
    scope = String(readJson(tokenPath).scope || "");
  } catch {
    add("Token parse", false, "Token file could not be parsed.");
  }
}
const scopeResult = tokenPresent ? scopeCheck(scope) : { pass: true, detail: "Skipped because token is missing; safe not connected." };
add("Read-only scope", scopeResult.pass, scopeResult.detail);
add("No write scope present", scopeResult.pass, scopeResult.detail);

let driveReady = false;
if (credentialsSafe && tokenSafe && credentialsPresent && tokenPresent && scopeResult.pass) {
  try {
    const credentials = readJson(credentialsPath);
    const token = readJson(tokenPath);
    const cfg = credentials.installed || credentials.web;
    if (!cfg?.client_id || !cfg?.client_secret) throw new Error("OAuth client fields missing.");
    const auth = new google.auth.OAuth2(cfg.client_id, cfg.client_secret, cfg.redirect_uris?.[0]);
    auth.setCredentials(token);
    const drive = google.drive({ version: "v3", auth });
    await drive.files.get({ fileId: targetFolderId, fields: "id,name,mimeType" });
    driveReady = true;
    add("Drive API readiness", true, "Target folder metadata is readable.");
  } catch (error) {
    add("Drive API readiness", false, error instanceof Error ? error.message : "Drive readiness failed.");
  }
} else {
  add("Drive API readiness", true, "Safe not connected; add read-only token outside repo after owner approval.");
}

console.table(rows);
console.log(`Target folder ID: ${targetFolderId}`);
console.log(`Next action: ${driveReady ? "Run npm.cmd run drive:readonly:list." : "Complete owner-approved read-only token setup outside the repo, then rerun preflight."}`);

const failed = rows.filter((row) => row.result === "FAIL" && !["Credentials file present", "Token file present"].includes(row.check));
if (failed.length) process.exit(1);
