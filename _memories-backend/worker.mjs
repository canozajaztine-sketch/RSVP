const drive = "https://www.googleapis.com/drive/v3";
const uploadHost = "https://www.googleapis.com";
const chunkSize = 2 * 1024 * 1024;
const maxSize = 200_000_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const types = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic",
  heif: "image/heif", mp4: "video/mp4", mov: "video/quicktime",
};
let access;
let refresh;

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function fail(status, message) {
  throw new RequestError(status, message);
}

function unavailable() {
  return fail(503, "The upload service is temporarily unavailable.");
}

function encode(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decode(value) {
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
}

async function sessionKey(env) {
  return crypto.subtle.importKey("raw", decode(env.SESSION_KEY), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function seal(env, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sessionKey(env), encoder.encode(JSON.stringify(data)));
  return `${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}

async function open(env, request) {
  const token = request.headers.get("Authorization")?.match(/^Bearer ([\w-]+)\.([\w-]+)$/);
  if (!token || token[0].length > 2500) fail(401, "The upload session is missing.");
  let data;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(token[1]) }, await sessionKey(env), decode(token[2]));
    data = JSON.parse(decoder.decode(plain));
  } catch {
    fail(401, "The upload session is invalid.");
  }
  if (data.expires < Date.now()) fail(410, "The upload session expired.");
  return data;
}

async function readBounded(request, limit) {
  if (Number(request.headers.get("Content-Length")) > limit) fail(413, "This upload exceeds the size limit.");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        fail(413, "This upload exceeds the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function validSignature(bytes, type) {
  const boxType = decoder.decode(bytes.subarray(4, 8));
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 16 || boxType !== "ftyp") return false;
  const boxSize = view.getUint32(0);
  if (boxSize < 16 || boxSize > bytes.length || boxSize % 4) return false;
  const brands = [decoder.decode(bytes.subarray(8, 12))];
  for (let offset = 16; offset < Math.min(64, boxSize); offset += 4) {
    brands.push(decoder.decode(bytes.subarray(offset, offset + 4)));
  }
  if (type.startsWith("image/")) return brands.some((brand) => /^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/.test(brand));
  return brands.some((brand) => /^(qt  |isom|iso[2-9]|mp4[12]|avc1|hvc1|hev1|M4V |dash|MSNV)$/.test(brand));
}

function fetchGoogle(url, init) {
  return fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(25_000) });
}

async function authorization(env) {
  if (access?.expires > Date.now()) return { Authorization: `Bearer ${access.token}` };
  refresh ??= (async () => {
    const response = await fetchGoogle("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: env.DRIVE_CLIENT_ID,
        client_secret: env.DRIVE_CLIENT_SECRET,
        refresh_token: env.DRIVE_REFRESH_TOKEN,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) unavailable();
    const data = await response.json();
    if (!data.access_token || !data.expires_in) unavailable();
    access = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
    return { Authorization: `Bearer ${access.token}` };
  })().finally(() => { refresh = undefined; });
  return refresh;
}

async function start(request, env) {
  let data;
  const body = await readBounded(request, 8192);
  try {
    data = JSON.parse(decoder.decode(body));
  } catch {
    fail(400, "Invalid upload details.");
  }

  const { filename, size, guest = "", message = "" } = data ?? {};
  if (typeof filename !== "string" || filename.length > 240 || /[\x00-\x1f\x7f/\\]/.test(filename)
      || typeof guest !== "string" || guest.length > 80 || typeof message !== "string" || message.length > 500) {
    fail(400, "Invalid upload details.");
  }
  const extension = filename.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
  if (!Object.hasOwn(types, extension)) fail(415, "Choose a JPEG, PNG, HEIC, MP4 or MOV file.");
  if (!Number.isSafeInteger(size) || size < 1 || size > maxSize) fail(413, "Choose a file up to 200 MB.");
  if (!env.DRIVE_FOLDER_ID || !env.SESSION_KEY) unavailable();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const address = encode(new Uint8Array(await crypto.subtle.sign("HMAC",
    await crypto.subtle.importKey("raw", decode(env.SESSION_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    encoder.encode(ip))));
  const quota = env.QUOTA.get(env.QUOTA.idFromName("reception"));
  const reservation = await quota.fetch("https://quota.internal/reserve", {
    method: "POST",
    body: JSON.stringify({ address, size }),
  });
  if (!reservation.ok) {
    if (reservation.status === 429) fail(429, await reservation.text());
    unavailable();
  }

  const auth = await authorization(env);
  const ids = await fetchGoogle(`${drive}/files/generateIds?count=1&space=drive`, { headers: auth });
  if (!ids.ok) unavailable();
  const id = (await ids.json()).ids?.[0];
  if (!id) unavailable();
  const type = types[extension];
  const description = [guest.trim() && `From: ${guest.trim()}`, message.trim()].filter(Boolean).join("\n\n");
  const created = await fetchGoogle(`${uploadHost}/upload/drive/v3/files?uploadType=resumable&fields=id,size`, {
    method: "POST",
    headers: {
      ...auth, "Content-Type": "application/json",
      "X-Upload-Content-Type": type, "X-Upload-Content-Length": String(size),
    },
    body: JSON.stringify({ id, name: filename, parents: [env.DRIVE_FOLDER_ID], mimeType: type, description }),
  });
  const url = created.headers.get("Location");
  if (!created.ok || !url?.startsWith(`${uploadHost}/upload/drive/v3/files?`)) unavailable();
  return { token: await seal(env, { url, id, size, type, expires: Date.now() + 24 * 60 * 60 * 1000 }) };
}

async function driveProgress(response, session, env) {
  if (response.ok) {
    const file = await response.json();
    if (file.id !== session.id || Number(file.size) !== session.size) unavailable();
    return { offset: session.size };
  }
  if (response.status === 308) {
    const range = response.headers.get("Range");
    const end = range?.match(/^bytes=0-(\d+)$/)?.[1];
    const offset = range ? Number(end) + 1 : 0;
    if (!Number.isSafeInteger(offset) || offset >= session.size) unavailable();
    return { offset };
  }
  if ([404, 410].includes(response.status)) {
    const file = await fetchGoogle(`${drive}/files/${encodeURIComponent(session.id)}?fields=id,size,trashed`, {
      headers: await authorization(env),
    });
    if (file.ok) {
      const record = await file.json();
      if (!record.trashed && Number(record.size) === session.size) return { offset: session.size };
    } else if (file.status !== 404) {
      unavailable();
    }
    fail(410, "The upload session expired.");
  }
  if (response.status === 400 || response.status === 416) fail(409, "Checking the saved upload position.");
  unavailable();
}

async function continueUpload(request, env, statusOnly) {
  const session = await open(env, request);
  const { url, size, type } = session;
  const headers = { "Content-Range": `bytes */${size}`, ...await authorization(env) };
  let body;
  if (!statusOnly) {
    const rawOffset = request.headers.get("Upload-Offset");
    const offset = Number(rawOffset);
    if (!rawOffset || !Number.isSafeInteger(offset) || offset < 0 || offset >= size || offset % (256 * 1024)) {
      fail(400, "Invalid upload position.");
    }
    const length = Math.min(chunkSize, size - offset);
    body = await readBounded(request, length);
    if (body.length !== length) fail(400, "The upload part was incomplete.");
    if (offset === 0 && !validSignature(body, type)) fail(415, "This file does not match its supported media format.");
    headers["Content-Type"] = type;
    headers["Content-Range"] = `bytes ${offset}-${offset + length - 1}/${size}`;
  }
  const result = await fetchGoogle(url, { method: "PUT", headers, body: body ?? new Uint8Array() });
  return driveProgress(result, session, env);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin !== env.ALLOWED_ORIGIN) return new Response(null, { status: 403 });
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Upload-Offset",
      "Access-Control-Max-Age": "86400",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      const path = new URL(request.url).pathname;
      if (request.method === "POST" && path === "/start") {
        const closes = Date.parse(env.UPLOAD_CLOSES);
        if (!Number.isFinite(closes)) unavailable();
        if (Date.now() >= closes) fail(403, "Wedding uploads have closed.");
        return Response.json(await start(request, env), { headers });
      }
      if ((request.method === "PUT" && path === "/chunk") || (request.method === "POST" && path === "/status")) {
        return Response.json(await continueUpload(request, env, path === "/status"), { headers });
      }
      return Response.json({ error: "Unknown upload route." }, { status: 404, headers });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 503;
      const message = error instanceof RequestError ? error.message : "The upload service is temporarily unavailable.";
      return Response.json({ error: message }, { status, headers });
    }
  },
};

export class UploadQuota {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec("CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, value INTEGER NOT NULL, hour INTEGER NOT NULL)");
  }

  async fetch(request) {
    const { address, size } = await request.json();
    const hour = Math.floor(Date.now() / 3_600_000);
    const byteLimit = Number(this.env.EVENT_BYTE_LIMIT);
    if (!Number.isSafeInteger(byteLimit) || byteLimit < 1) return new Response(null, { status: 503 });
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM limits WHERE hour >= 0 AND hour < ?", hour);
      const read = (key) => this.sql.exec("SELECT value FROM limits WHERE key = ?", key).toArray()[0]?.value ?? 0;
      if (read(address) >= 900 || read("hourly") >= 1500) {
        return new Response("Too many uploads right now. Please try again later.", { status: 429 });
      }
      if (read("files") >= 4000 || read("bytes") + size > byteLimit) {
        return new Response("The wedding upload limit has been reached.", { status: 429 });
      }
      for (const [key, value, window] of [[address, 1, hour], ["hourly", 1, hour], ["files", 1, -1], ["bytes", size, -1]]) {
        this.sql.exec("INSERT INTO limits VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = value + excluded.value", key, value, window);
      }
      return new Response(null, { status: 204 });
    });
  }
}
