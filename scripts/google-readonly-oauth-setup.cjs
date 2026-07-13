#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.metadata",
  "https://www.googleapis.com/auth/tasks.readonly"
];

const OUTPUT_FILE = ".tmp-google-readonly-oauth-env.json";
const LOCAL_CREDENTIALS_PATH = "C:\\Users\\TRS_F\\.property-command\\google-drive\\credentials.json";

function clean(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = clean(match[2]);
  }
}

function loadLocalEnv() {
  [".env.local", ".env.production.local", ".env"].forEach(loadEnvFile);
}

function oauthClient() {
  loadLocalEnv();
  let clientId = clean(process.env.GOOGLE_CLIENT_ID);
  let clientSecret = clean(process.env.GOOGLE_CLIENT_SECRET);
  let redirectUri = clean(process.env.GOOGLE_REDIRECT_URI);

  if ((!clientId || !clientSecret) && fs.existsSync(LOCAL_CREDENTIALS_PATH)) {
    const credentials = JSON.parse(fs.readFileSync(LOCAL_CREDENTIALS_PATH, "utf8"));
    const config = credentials.installed || credentials.web || {};
    clientId = clientId || clean(config.client_id);
    clientSecret = clientSecret || clean(config.client_secret);
    redirectUri = redirectUri || clean((config.redirect_uris || [])[0]);
  }

  redirectUri = redirectUri || "urn:ietf:wg:oauth:2.0:oob";

  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Add them to .env.local, the shell, or the local credentials file before running this script.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function printAuthUrl() {
  const client = oauthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    include_granted_scopes: false
  });

  console.log("Open this URL while signed into the owner Google account:");
  console.log(url);
  console.log("");
  console.log("After Google returns an authorization code, run:");
  console.log("node scripts/google-readonly-oauth-setup.cjs exchange --code <AUTHORIZATION_CODE>");
  console.log("");
  console.log("Requested read-only scopes:");
  for (const scope of SCOPES) console.log(`- ${scope}`);
}

function askCode() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Paste authorization code: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function exchangeCode(codeArg) {
  const code = codeArg || (await askCode());
  if (!code) throw new Error("Authorization code is required.");

  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Re-run auth-url and confirm prompt=consent is used.");
  }

  const tokenJson = JSON.stringify({
    refresh_token: tokens.refresh_token,
    scope: SCOPES.join(" "),
    token_type: tokens.token_type || "Bearer"
  });

  const output = {
    GOOGLE_DRIVE_READONLY_ENABLED: "true",
    GOOGLE_DRIVE_READONLY_TOKEN: tokenJson,
    GOOGLE_CALENDAR_READONLY_ENABLED: "true",
    GOOGLE_CALENDAR_READONLY_TOKEN: tokenJson,
    GOOGLE_GMAIL_READONLY_ENABLED: "true",
    GOOGLE_GMAIL_READONLY_TOKEN: tokenJson,
    GOOGLE_TASKS_READONLY_ENABLED: "true",
    GOOGLE_TASKS_READONLY_TOKEN: tokenJson
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`New read-only OAuth token bundle saved to ${OUTPUT_FILE}.`);
  console.log("Token values were not printed.");
  console.log("Use this file to add the listed variables to Vercel Production, then delete it.");
}

async function main() {
  const command = process.argv[2] || "auth-url";
  if (command === "auth-url") {
    printAuthUrl();
    return;
  }

  if (command === "exchange") {
    const codeIndex = process.argv.indexOf("--code");
    await exchangeCode(codeIndex >= 0 ? process.argv[codeIndex + 1] : "");
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
