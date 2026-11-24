# Wedding photo and video uploads

The guest link is https://canozajaztine-sketch.github.io/RSVP/#upload. GitHub Pages still serves the existing RSVP site from `main` at the repository root. The separate Cloudflare Worker sends original bytes to a private folder in the couple's personal Google Drive. Guests use the browser's media picker and do not sign in.

## 1. Connect the owner's Google Drive

Use Node.js 22 or newer and a desktop browser on the same computer. Use the Google account that owns the existing Wedding Memories folder. In Drive, confirm its **General access** is **Restricted**.

1. In [Google Cloud Console](https://console.cloud.google.com/), select **Wedding Memories 2026** and verify that both **Google Drive API** and **Google Picker API** are enabled in that project.
2. In **Google Auth Platform**, configure **Branding**, select **External** under **Audience** for personal Gmail, and add `https://www.googleapis.com/auth/drive.file` under **Data Access**. Set the OAuth app's publishing status to **In production** before authorizing the event connection. Refresh tokens issued for Drive scopes while an External app is in **Testing** generally expire after seven days.
3. Under **Clients**, create a **Desktop app** OAuth client and save the downloaded JSON outside the repository. This client type uses the local loopback callback `http://127.0.0.1:8765/oauth/callback` with PKCE. There are no redirect URI or JavaScript origin fields to enter for the Desktop client. The guest site and Worker have no OAuth callback. An existing **Web application** OAuth client is unused by this flow.
4. In the same project, open **APIs & Services → Credentials → Create credentials → API key**. Edit the key. Under **Application restrictions**, select **Websites** and add `http://127.0.0.1:8765/*`. Under **API restrictions**, select **Restrict key** and select **Google Picker API**, then save. Copy the project's numeric **Project number** from Google Cloud's project settings.
5. Create a second local JSON file named `folder-config.json` outside the repository. Set `folderId` to the exact ID after `/folders/` in the existing Wedding Memories Google Drive link. Keep both JSON files private.

   ```json
   {
     "folderId": "PASTE_THE_EXISTING_FOLDER_ID",
     "projectNumber": "PASTE_THE_NUMERIC_PROJECT_NUMBER",
     "pickerApiKey": "PASTE_THE_RESTRICTED_PICKER_API_KEY"
   }
   ```

6. From the repository root, run the helper. In the same desktop browser, open the authorization URL it prints, sign in as the folder owner, and approve access. If it prints a second, local URL, open it, click **Choose folder**, and select the exact Wedding Memories folder from your configuration.

   ```sh
   cd _memories-backend
   node connect-drive.mjs /absolute/path/to/desktop-client.json /absolute/path/to/folder-config.json
   ```

The `drive.file` scope is limited to items the app created or has been granted access to. The helper checks the exact ID with the Desktop client's token first and opens Picker if it needs your folder grant. It then refreshes the OAuth token and verifies access to the same folder, ownership, Restricted general access and permission to add files. The helper uses the existing folder throughout. It refuses to overwrite a saved secrets file. Keep any existing file privately before reconnecting. Rotating the session key expires uploads already in progress.

The Picker runs only on the owner's computer. It uses a short-lived Drive access token in its loopback setup page. The OAuth client secret and refresh token stay in the helper and the private, ignored `.dev.vars.drive.json` output file. Keep that file and both input files outside any commits, uploads, or shared archives. The output stores the folder ID as `DRIVE_FOLDER_ID`, alongside the Worker secrets.

## 2. Deploy the Worker after review and approval

From `_memories-backend`, authenticate to the Cloudflare account that will host the Worker. Enable its `workers.dev` subdomain if prompted. A dry run checks the bundle without publishing it. Run the last two commands only after approval to deploy.

```sh
npx wrangler@4 login
npx wrangler@4 deploy --dry-run
npx wrangler@4 deploy
npx wrangler@4 secret bulk .dev.vars.drive.json
```

The real deployment prints the public Worker URL. The Worker reads `DRIVE_FOLDER_ID` from its secret bindings and uses it as the parent for uploaded media. Only the public Worker URL belongs in the guest site's configuration. Before releasing to Pages, configure that URL in a local copy of the upload page served from an origin allowed by the test Worker, send a photo and a video, and verify they appear in the exact owner-selected Drive folder. To test locally without changing the production Worker settings, use a separate test Worker configuration with its own worker name and local `ALLOWED_ORIGIN`, and remove the test Worker when finished.

The default limits are 20 selected files per submission, 200 MB per file, 900 file starts per source IP per hour, 1,500 per event hour, 4,000 over the event and 12 GB total. The event budget counts declared bytes when a file starts, including abandoned attempts, so the Worker cannot overcommit the budget. Set `EVENT_BYTE_LIMIT` below your available Drive storage, and change `UPLOAD_CLOSES` if you want a different closing date. The default is January 5, 2027 at midnight Philippine time. Public access uses per-IP limits, an event quota, bounded chunks, format signature checks and encrypted, expiring upload sessions. A public QR can be forwarded. The Worker accepts authenticated upload-session requests for up to 24 hours after a session starts. Guest names and messages are saved in each file's private Drive description.

## 3. Release to the existing site

1. Set `uploadEndpoint` in `memories/config.js` to the public HTTPS Worker URL, with no route suffix.
2. Commit and push the changes to `main` using an account authorized for the existing repository. Leave the Pages source set to `main` and `/ (root)`. The Worker source is under an underscore-prefixed folder so Jekyll excludes it.
3. After the Pages deployment, open the QR URL directly in a fresh private browser window on a phone. The picker should be immediately visible. Test choosing from the library and using the camera where the device offers it. Select a JPEG and an MP4 or MOV larger than 2 MiB, enter a test name and message, and tap **Send Memories**. Keep the browser open during transfer.
4. Sign in as the owner and confirm both files appear in the private Drive folder, their sizes match the originals, the video plays, and the file details show the optional name and message. For a byte-for-byte check, download the files and compare SHA-256 hashes. Try again with **Upload More Memories**, and verify the invitation and RSVP still open from the normal website URL. On a real device, also try briefly losing connectivity while a video is uploading. Retrying in the same tab resumes at the last saved position when possible.
5. Print [the 5 × 7 inch card](../memories/reception-card.pdf) at actual size, or use the [high-resolution QR PNG](../memories/reception-qr.png). Scan a proof before placing the cards at the reception.

This deployment is complete when a guest-style upload has been confirmed in the owner's Google Drive.
