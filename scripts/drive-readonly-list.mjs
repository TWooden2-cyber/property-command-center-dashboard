import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const repoRoot = process.cwd();
const targetFolderId = "1200_qPBmBz6KHjZY59HTPMpvXTCt5bGt";
const readonlyScope = "https://www.googleapis.com/auth/drive.metadata.readonly";
const credentialsPath = "C:\\Users\\TRS_F\\.property-command\\google-drive\\credentials.json";
const tokenPath = "C:\\Users\\TRS_F\\.property-command\\google-drive\\token.json";

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

console.table((response.data.files || []).map((file) => ({
  id: file.id,
  name: file.name,
  mimeType: file.mimeType,
  modifiedTime: file.modifiedTime,
  size: file.size || "",
  webViewLink: file.webViewLink || ""
})));
console.log("Read-only metadata listing complete. No file contents read and no Drive writes performed.");
