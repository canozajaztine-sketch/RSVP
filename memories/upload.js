import { uploadEndpoint } from "./config.js";

const select = (id) => document.getElementById(`memories-${id}`);
const form = select("form");
const picker = select("files");
const list = select("selection");
const name = select("name");
const message = select("message");
const send = select("send");
const progress = select("progress");
const success = select("success");
const maxFiles = 20;
const maxBytes = 200_000_000;
const chunkBytes = 2 * 1024 * 1024;
const supported = /\.(jpe?g|png|hei[cf]|mp4|mov)$/i;
const video = /\.(mp4|mov)$/i;
let items = [];
let sent = 0;
let busy = false;

function status(text) {
  select("status").hidden = !text;
  select("status").textContent = text;
}

function remove(item) {
  if (busy) return;
  URL.revokeObjectURL(item.url);
  items = items.filter((entry) => entry !== item);
  item.row.remove();
  list.hidden = !items.length;
  send.disabled = !items.length || !uploadEndpoint;
}

function add(file) {
  const item = { file, url: URL.createObjectURL(file) };
  const row = document.createElement("li");
  const preview = document.createElement(video.test(file.name) ? "video" : "img");
  preview.setAttribute("aria-hidden", "true");
  if (preview.tagName === "VIDEO") {
    preview.preload = "metadata";
    preview.muted = true;
    preview.playsInline = true;
  } else {
    preview.alt = "";
    preview.loading = "lazy";
  }
  preview.addEventListener("error", () => {
    const fallback = document.createElement("span");
    fallback.className = "memories-placeholder";
    fallback.textContent = video.test(file.name) ? "Video" : "Photo";
    preview.replaceWith(fallback);
  });
  preview.src = item.url;
  const filename = document.createElement("span");
  filename.className = "memories-filename";
  filename.textContent = file.name;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Remove";
  button.setAttribute("aria-label", `Remove ${file.name}`);
  button.addEventListener("click", () => remove(item));
  row.append(preview, filename, button);
  list.append(row);
  items.push(Object.assign(item, { row, button }));
}

picker.addEventListener("change", () => {
  const problems = new Set();
  for (const file of picker.files) {
    if (items.some(({ file: selected }) =>
      selected.name === file.name && selected.size === file.size && selected.lastModified === file.lastModified)) continue;
    if (items.length >= maxFiles) {
      problems.add("You can send up to 20 files at a time.");
      break;
    }
    if (!supported.test(file.name) || !file.size || file.size > maxBytes) {
      problems.add(`${file.name} must be a supported file up to 200 MB.`);
      continue;
    }
    add(file);
  }
  picker.value = "";
  list.hidden = !items.length;
  send.disabled = !items.length || !uploadEndpoint;
  status(problems.size ? [...problems].join(" ") : uploadEndpoint ? "" : unavailable);
});

const unavailable = "Uploads are unavailable right now.";
if (!uploadEndpoint) status(unavailable);

function request(path, method, body, headers, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadEndpoint.replace(/\/$/, "") + path);
    xhr.responseType = "json";
    xhr.timeout = 90_000;
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    if (onProgress) xhr.upload.onprogress = ({ loaded }) => onProgress(loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        resolve(xhr.response);
      } else {
        const error = new Error(xhr.response?.error || "The upload service is temporarily unavailable.");
        error.status = xhr.status;
        reject(error);
      }
    };
    xhr.onerror = xhr.ontimeout = () => reject(new Error("The connection was interrupted."));
    xhr.send(body);
  });
}

function isRetryable(error) {
  return !error.status || error.status >= 500;
}

async function retry(operation) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt + Math.random() * 500));
    }
  }
}

function showProgress(bytes, total) {
  const percent = Math.min(99, Math.floor(100 * bytes / total));
  progress.value = percent;
  select("percent").textContent = `${percent}%`;
}

async function upload(item, onProgress) {
  const { file } = item;
  try {
    if (!item.token) {
      const result = await retry(() => request("/start", "POST", JSON.stringify({
        filename: file.name, size: file.size, guest: name.value.trim(), message: message.value.trim(),
      }), { "Content-Type": "application/json" }));
      item.token = result.token;
      item.offset = 0;
    }

    const headers = { Authorization: `Bearer ${item.token}` };
    while (item.offset < file.size) {
      const start = item.offset;
      const end = Math.min(start + chunkBytes, file.size);
      const result = await retry(async () => {
        try {
          return await request("/chunk", "PUT", file.slice(start, end), {
            ...headers, "Content-Type": "application/octet-stream", "Upload-Offset": String(start),
          }, (loaded) => onProgress(start + loaded));
        } catch (error) {
          if (!isRetryable(error) && error.status !== 409) throw error;
          const state = await request("/status", "POST", null, headers);
          if (state.offset > start) return state;
          if (error.status === 409) throw new Error("The upload was interrupted.");
          throw error;
        }
      });
      if (!Number.isInteger(result.offset) || result.offset <= start || result.offset > file.size) {
        throw new Error("The upload did not advance.");
      }
      item.offset = result.offset;
      onProgress(item.offset);
    }
  } catch (error) {
    if ([401, 410].includes(error.status)) delete item.token;
    throw error;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy || !items.length || !uploadEndpoint) return;
  busy = true;
  const batch = [...items];
  const total = batch.reduce((sum, item) => sum + item.file.size, 0);
  let complete = 0;
  send.disabled = picker.disabled = name.disabled = message.disabled = true;
  picker.labels[0].setAttribute("aria-disabled", "true");
  batch.forEach(({ button }) => { button.disabled = true; });
  select("progress-wrap").hidden = false;
  showProgress(0, total);

  try {
    for (const item of batch) {
      status(`Sending ${item.file.name}… Keep this page open.`);
      await upload(item, (bytes) => showProgress(complete + bytes, total));
      complete += item.file.size;
      sent += 1;
      URL.revokeObjectURL(item.url);
      item.row.remove();
      items.shift();
    }
    progress.value = 100;
    status("");
    form.hidden = true;
    success.hidden = false;
    select("confirmation").textContent = `We received ${sent} ${sent === 1 ? "file" : "files"}.`;
    select("thanks").focus();
  } catch (error) {
    select("progress-wrap").hidden = true;
    status(`${error.message} ${sent ? `${sent} already received. ` : ""}Tap Send Memories to try the remaining files again.`);
  } finally {
    busy = false;
    list.hidden = !items.length;
    send.disabled = !items.length;
    picker.disabled = name.disabled = message.disabled = false;
    picker.labels[0].removeAttribute("aria-disabled");
    items.forEach(({ button }) => { button.disabled = false; });
  }
});

select("more").addEventListener("click", () => {
  sent = 0;
  select("progress-wrap").hidden = true;
  success.hidden = true;
  form.hidden = false;
  picker.focus();
});
