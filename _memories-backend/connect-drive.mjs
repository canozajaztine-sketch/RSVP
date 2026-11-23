import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { chooseFolder, waitForRequest } from "./folder-picker.mjs";

const output = ".dev.vars.drive.json";
const origin = "http://127.0.0.1:8765";
const redirect = `${origin}/oauth/callback`;
const scope = "https://www.googleapis.com/auth/drive.file";
const folderType = "application/vnd.google-apps.folder";

async function readConfig(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error(`Could not read the ${label} JSON file.`);
  }
}

async function inspectFolder(accessToken, folderId) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${folderId}`);
  url.searchParams.set("fields", "id,mimeType,trashed,ownedByMe,isAppAuthorized,capabilities(canAddChildren),permissions(type)");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 403 && data.error?.errors?.some(({ reason }) => reason === "appNotAuthorizedToFile")) {
      return false;
    }
    throw new Error(`Drive folder check failed (HTTP ${response.status}).`);
  }
  const folder = await response.json();
  if (folder.id !== folderId || folder.mimeType !== folderType || folder.trashed) {
    throw new Error("The configured ID must identify an existing, untrashed Google Drive folder.");
  }
  if (!folder.ownedByMe || !folder.capabilities?.canAddChildren) {
    throw new Error("Sign in as the folder owner with permission to add files.");
  }
  if (!Array.isArray(folder.permissions) ||
      folder.permissions.some(({ type }) => type === "anyone" || type === "domain")) {
    throw new Error("Confirm the folder has Restricted general access in Google Drive and try again.");
  }
  return folder.isAppAuthorized === true;
}

async function exchange(client, parameters) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      ...parameters,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Google token exchange failed (HTTP ${response.status}).`);
  const tokens = await response.json();
  if (!tokens.access_token) throw new Error("Google did not return an access token.");
  return tokens;
}

async function authorize(server, client) {
  const verifier = randomBytes(64).toString("base64url");
  const state = randomBytes(32).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirect,
    scope,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  const code = await waitForRequest(server, origin, (request, response, incoming, finish) => {
    const returned = Buffer.from(incoming.searchParams.get("state") ?? "");
    if (request.method !== "GET" || incoming.pathname !== "/oauth/callback" ||
        returned.length !== state.length || !timingSafeEqual(returned, Buffer.from(state))) {
      response.writeHead(400).end("Invalid Google authorization callback.");
      return;
    }
    const code = incoming.searchParams.get("code");
    const nonce = randomBytes(16).toString("base64");
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'`,
    }).end(`<!doctype html><title>Wedding Memories setup</title>
      <p>Return to your terminal to continue with the folder connection.</p>
      <script nonce="${nonce}">history.replaceState(null, "", "/oauth/callback");</script>`);
    finish(code, code ? undefined : new Error("Google authorization was declined."));
  }, () => {
    console.log("Open this URL on this computer and sign in as the Drive folder owner.");
    console.log(url.href);
  });
  const tokens = await exchange(client, {
    grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirect,
  });
  if (!tokens.refresh_token || !tokens.scope?.split(/\s+/).includes(scope)) {
    throw new Error("Google did not return offline access with the required drive.file permission.");
  }
  return tokens;
}

async function connect() {
  const [clientPath, targetPath] = process.argv.slice(2);
  if (!clientPath || !targetPath) {
    throw new Error("Usage: node connect-drive.mjs /path/to/desktop-client.json /path/to/folder-config.json");
  }
  const { installed } = await readConfig(clientPath, "Desktop OAuth client");
  const { folderId, projectNumber, pickerApiKey } = await readConfig(targetPath, "folder configuration");
  if (!installed?.client_id || !installed?.client_secret) throw new Error("Use a Desktop app OAuth client.");
  if (typeof folderId !== "string" || !/^[\w-]{10,}$/.test(folderId)) throw new Error("Enter the existing Google Drive folder ID.");
  if (typeof projectNumber !== "string" || !/^\d+$/.test(projectNumber) ||
      typeof pickerApiKey !== "string" || !pickerApiKey.trim()) {
    throw new Error("Enter the Google Cloud project number and the restricted Google Picker API key.");
  }

  const server = createServer((request, response) => {
    if (server.listenerCount("request") === 1) {
      response.writeHead(404).end();
    }
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(8765, "127.0.0.1", resolve);
    });
    const tokens = await authorize(server, installed);
    if (!await inspectFolder(tokens.access_token, folderId)) {
      await chooseFolder(server, origin, { folderId, projectNumber, pickerApiKey, accessToken: tokens.access_token });
    }
    const refreshed = await exchange(installed, { grant_type: "refresh_token", refresh_token: tokens.refresh_token });
    if (!await inspectFolder(refreshed.access_token, folderId)) {
      throw new Error("Drive did not grant the app access to the configured folder.");
    }
    await writeFile(output, JSON.stringify({
      DRIVE_CLIENT_ID: installed.client_id,
      DRIVE_CLIENT_SECRET: installed.client_secret,
      DRIVE_REFRESH_TOKEN: tokens.refresh_token,
      DRIVE_FOLDER_ID: folderId,
      SESSION_KEY: randomBytes(32).toString("base64url"),
    }, null, 2), { flag: "wx", mode: 0o600 });
    console.log(`Verified the existing folder. Worker secrets were saved locally to ${output}.`);
  } finally {
    server.close();
  }
}

connect().catch((error) => {
  console.error(error.code === "EEXIST" ? `${output} already exists. Preserve it before reconnecting.` : error.message);
  process.exitCode = 1;
});
