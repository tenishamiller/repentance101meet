/**
 * Ensure the uploads bucket exists and allows large recording files (500 MB).
 * Usage: node scripts/ensure-storage-bucket.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

const createRes = await fetch(`${url}/storage/v1/bucket`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    id: "uploads",
    name: "uploads",
    public: true,
    file_size_limit: 524288000,
  }),
});

if (!createRes.ok && createRes.status !== 409) {
  console.warn("Create bucket:", createRes.status, (await createRes.text()).slice(0, 200));
}

const updateRes = await fetch(`${url}/storage/v1/bucket/uploads`, {
  method: "PUT",
  headers,
  body: JSON.stringify({ public: true, file_size_limit: 524288000 }),
});

console.log(
  "Storage bucket:",
  updateRes.ok ? "ready (500 MB limit)" : `update failed ${updateRes.status}`,
);
