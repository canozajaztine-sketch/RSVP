import { randomBytes } from "node:crypto";

const folderType = "application/vnd.google-apps.folder";

export function waitForRequest(server, origin, handle, prompt) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(null, new Error("Local Google Drive setup timed out.")), 300_000);
    function finish(value, error) {
      clearTimeout(timer);
      server.off("request", onRequest);
      if (error) reject(error);
      else resolve(value);
    }
    function onRequest(request, response) {
      if (response.writableEnded) return;
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      if (request.headers.host !== new URL(origin).host || !request.url.startsWith("/") || request.url.startsWith("//")) {
        response.writeHead(403).end();
        return;
      }
      const incoming = new URL(request.url, origin);
      if (incoming.origin !== origin) {
        response.writeHead(403).end();
        return;
      }
      handle(request, response, incoming, finish);
    }
    server.on("request", onRequest);
    prompt();
  });
}

function pickerPage(settings, nonce) {
  const config = JSON.stringify(settings).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>Choose the existing wedding folder</title>
<h1>Choose the existing wedding folder</h1>
<p>In Google Picker, select the Wedding Memories folder you already created.</p>
<button id="choose" type="button" disabled>Choose folder</button>
<p id="status" role="status">Loading Google Picker…</p>
<script src="https://apis.google.com/js/api.js"></script>
<script nonce="${nonce}">
  (() => {
    const settings = ${config};
    const button = document.getElementById("choose");
    const status = document.getElementById("status");
    history.replaceState(null, "", "/choose-folder");
    if (!window.gapi) {
      status.textContent = "Google Picker could not load. Restart the setup to try again.";
      return;
    }
    gapi.load("picker", {
      callback: () => {
        button.disabled = false;
        status.textContent = "";
      },
      onerror: () => {
        status.textContent = "Google Picker could not load. Restart the setup to try again.";
      }
    });
    button.addEventListener("click", () => {
      const picker = google.picker;
      const view = new picker.DocsView(picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes(${JSON.stringify(folderType)});
      new picker.PickerBuilder()
        .setOrigin(location.origin)
        .setDeveloperKey(settings.pickerApiKey)
        .setAppId(settings.projectNumber)
        .setOAuthToken(settings.accessToken)
        .addView(view)
        .setCallback(async (result) => {
          if (result.action !== picker.Action.PICKED) return;
          const folder = result[picker.Response.DOCUMENTS]?.[0];
          if (folder?.[picker.Document.ID] !== settings.folderId) {
            status.textContent = "Choose the exact folder from your configuration.";
            return;
          }
          button.disabled = true;
          try {
            const response = await fetch("/folder-selected", {
              method: "POST",
              headers: { "X-Setup-Key": settings.key, "X-Folder-ID": settings.folderId }
            });
            if (!response.ok) throw new Error();
            status.textContent = "Selection received. Close this tab and check your terminal.";
          } catch {
            status.textContent = "Selection could not be confirmed. Return to your terminal.";
          }
        })
        .build()
        .setVisible(true);
    });
  })();
</script>
</html>`;
}

export function chooseFolder(server, origin, settings) {
  const key = randomBytes(32).toString("base64url");
  const nonce = randomBytes(16).toString("base64");
  return waitForRequest(server, origin, (request, response, url, finish) => {
    if (request.method === "GET" && url.pathname === "/choose-folder" && url.searchParams.get("key") === key) {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "origin",
        "Content-Security-Policy": [
          "default-src 'none'",
          `script-src 'nonce-${nonce}' https://apis.google.com https://www.gstatic.com`,
          "frame-src https://docs.google.com https://drive.google.com https://accounts.google.com",
          "connect-src 'self' https://www.googleapis.com https://picker.googleapis.com https://docs.google.com",
          "style-src 'unsafe-inline'",
          "frame-ancestors 'none'",
          "base-uri 'none'",
        ].join("; "),
      }).end(pickerPage({ ...settings, key }, nonce));
      return;
    }
    if (request.method === "POST" && url.pathname === "/folder-selected" &&
        request.headers.origin === origin && request.headers["x-setup-key"] === key &&
        request.headers["x-folder-id"] === settings.folderId) {
      response.writeHead(204).end();
      finish();
      return;
    }
    response.writeHead(403).end();
  }, () => {
    console.log("Open this local URL on the same computer and choose the exact configured Google Drive folder.");
    console.log(`${origin}/choose-folder?key=${key}`);
  });
}
