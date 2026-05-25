import fs from "node:fs/promises";
import path from "node:path";
import { google } from "googleapis";
import {
  DRIVE_READONLY_CREDENTIALS_PATH,
  DRIVE_READONLY_SCOPE,
  DRIVE_READONLY_TARGET_FOLDER_ID,
  DRIVE_READONLY_TARGET_FOLDER_NAME,
  DRIVE_READONLY_TOKEN_PATH
} from "@/lib/googleDriveReadonlyConfig";

const repoRoot = process.cwd();
const unsafeScopeFragments = [
  "https://www.googleapis.com/auth/drive ",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.photos.readonly",
  "https://www.googleapis.com/auth/drive.readonly"
];

export type DriveReadonlyMetadata = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
};

export type DriveReadonlyStatus = {
  connected: boolean;
  disabled: boolean;
  reason: string;
  targetFolderId: string;
  targetFolderName: string;
  credentialsPathSafe: boolean;
  tokenPathSafe: boolean;
  credentialsPresent: boolean;
  tokenPresent: boolean;
  scopeSafe: boolean;
  scopeStatus: string;
  lastLocalCheck: string;
  items: DriveReadonlyMetadata[];
};

type OAuthCredentials = {
  installed?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
};

type TokenShape = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  expiry_date?: number;
  token_type?: string;
};

function isPathOutsideRepo(filePath: string) {
  const relative = path.relative(repoRoot, filePath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative) ? false : true;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function evaluateDriveReadonlyScopes(scope?: string) {
  if (!scope) {
    return { safe: false, status: "Missing token scope; refusing to list Drive metadata." };
  }

  const normalized = ` ${scope.trim()} `;
  const hasReadonlyScope = normalized.includes(` ${DRIVE_READONLY_SCOPE} `);
  const scopeValues = scope.split(/\s+/).filter(Boolean);
  const hasUnsafeScope = unsafeScopeFragments.some((fragment) => normalized.includes(` ${fragment.trim()} `));
  const hasOtherGoogleApiScope = scopeValues.some((scopeValue) => scopeValue.startsWith("https://www.googleapis.com/auth/") && scopeValue !== DRIVE_READONLY_SCOPE);

  if (!hasReadonlyScope) {
    return { safe: false, status: "Required metadata/read-only scope is missing." };
  }

  if (hasUnsafeScope || hasOtherGoogleApiScope) {
    return { safe: false, status: "Unsafe or unrelated Google API scope detected; refusing to run." };
  }

  return { safe: true, status: "Metadata/read-only scope only." };
}

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function getDriveReadonlyStatus(): Promise<DriveReadonlyStatus> {
  const credentialsPathSafe = isPathOutsideRepo(DRIVE_READONLY_CREDENTIALS_PATH);
  const tokenPathSafe = isPathOutsideRepo(DRIVE_READONLY_TOKEN_PATH);
  const credentialsPresent = await fileExists(DRIVE_READONLY_CREDENTIALS_PATH);
  const tokenPresent = await fileExists(DRIVE_READONLY_TOKEN_PATH);
  let scopeStatus = "Token not checked.";
  let scopeSafe = false;

  if (tokenPresent) {
    try {
      const token = await loadJson<TokenShape>(DRIVE_READONLY_TOKEN_PATH);
      const scopeCheck = evaluateDriveReadonlyScopes(token.scope);
      scopeSafe = scopeCheck.safe;
      scopeStatus = scopeCheck.status;
    } catch {
      scopeStatus = "Token file could not be parsed safely.";
    }
  } else {
    scopeStatus = "Token missing; read-only Drive listing not connected.";
  }

  const disabledReason = [
    !credentialsPathSafe ? "Credentials path is inside the repo." : "",
    !tokenPathSafe ? "Token path is inside the repo." : "",
    !credentialsPresent ? "Credentials file missing." : "",
    !tokenPresent ? "Token file missing." : "",
    tokenPresent && !scopeSafe ? scopeStatus : ""
  ].filter(Boolean)[0];

  return {
    connected: !disabledReason,
    disabled: Boolean(disabledReason),
    reason: disabledReason || "Read-only Drive metadata listing is available locally.",
    targetFolderId: DRIVE_READONLY_TARGET_FOLDER_ID,
    targetFolderName: DRIVE_READONLY_TARGET_FOLDER_NAME,
    credentialsPathSafe,
    tokenPathSafe,
    credentialsPresent,
    tokenPresent,
    scopeSafe,
    scopeStatus,
    lastLocalCheck: new Date().toISOString(),
    items: []
  };
}

export async function listDriveReadonlyMetadata(): Promise<DriveReadonlyStatus> {
  const status = await getDriveReadonlyStatus();

  if (status.disabled) {
    return status;
  }

  const credentials = await loadJson<OAuthCredentials>(DRIVE_READONLY_CREDENTIALS_PATH);
  const token = await loadJson<TokenShape>(DRIVE_READONLY_TOKEN_PATH);
  const scopeCheck = evaluateDriveReadonlyScopes(token.scope);

  if (!scopeCheck.safe) {
    return { ...status, connected: false, disabled: true, reason: scopeCheck.status, scopeSafe: false, scopeStatus: scopeCheck.status };
  }

  const oauthConfig = credentials.installed || credentials.web;
  if (!oauthConfig?.client_id || !oauthConfig.client_secret) {
    return { ...status, connected: false, disabled: true, reason: "Credentials file is missing OAuth client fields." };
  }

  const auth = new google.auth.OAuth2(oauthConfig.client_id, oauthConfig.client_secret, oauthConfig.redirect_uris?.[0]);
  auth.setCredentials(token);

  const drive = google.drive({ version: "v3", auth });
  await drive.files.get({
    fileId: DRIVE_READONLY_TARGET_FOLDER_ID,
    fields: "id,name,mimeType,parents,modifiedTime,webViewLink"
  });

  const response = await drive.files.list({
    q: `'${DRIVE_READONLY_TARGET_FOLDER_ID}' in parents and trashed = false`,
    pageSize: 100,
    fields: "files(id,name,mimeType,parents,modifiedTime,webViewLink,size)",
    orderBy: "folder,name"
  });

  return {
    ...status,
    connected: true,
    disabled: false,
    reason: "Read-only Drive metadata listing completed.",
    items: (response.data.files || []).map((file) => ({
      id: file.id || "",
      name: file.name || "",
      mimeType: file.mimeType || "",
      parents: file.parents || undefined,
      modifiedTime: file.modifiedTime || undefined,
      webViewLink: file.webViewLink || undefined,
      size: file.size || undefined
    }))
  };
}
