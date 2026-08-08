/**
 * Ensure the uploads bucket exists (avatars, chat files, recordings).
 * Usage: node scripts/ensure-storage-bucket.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET_ID = "uploads";
/** Supabase free tier caps bucket size limits; 50 MB is safe for avatars and small files. */
const FILE_SIZE_LIMIT = 52_428_800;

function loadEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("Skip: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${key}`,
  apikey: key,
  "Content-Type": "application/json",
};

async function listBuckets() {
  const res = await fetch(`${url}/storage/v1/bucket`, { headers });
  if (!res.ok) {
    console.warn("List buckets:", res.status, (await res.text()).slice(0, 200));
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

const existing = await listBuckets();
const hasBucket = existing.some((b) => b.id === BUCKET_ID || b.name === BUCKET_ID);

if (!hasBucket) {
  const createRes = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: BUCKET_ID,
      name: BUCKET_ID,
      public: true,
      file_size_limit: FILE_SIZE_LIMIT,
    }),
  });

  if (!createRes.ok && createRes.status !== 409) {
    const errText = await createRes.text();
    console.warn("Create bucket with limit failed:", createRes.status, errText.slice(0, 200));

    const fallbackRes = await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id: BUCKET_ID, name: BUCKET_ID, public: true }),
    });

    if (!fallbackRes.ok && fallbackRes.status !== 409) {
      console.warn("Create bucket:", fallbackRes.status, (await fallbackRes.text()).slice(0, 200));
      process.exit(1);
    }
    console.log(`Storage bucket "${BUCKET_ID}" created (public).`);
  } else {
    console.log(`Storage bucket "${BUCKET_ID}" created (${FILE_SIZE_LIMIT / 1024 / 1024} MB limit).`);
  }
} else {
  console.log(`Storage bucket "${BUCKET_ID}" already exists.`);
}

const updateRes = await fetch(`${url}/storage/v1/bucket/${BUCKET_ID}`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ public: true, file_size_limit: FILE_SIZE_LIMIT }),
});

console.log(
  "Storage bucket:",
  updateRes.ok ? `ready (${FILE_SIZE_LIMIT / 1024 / 1024} MB limit)` : `update skipped (${updateRes.status})`,
);
