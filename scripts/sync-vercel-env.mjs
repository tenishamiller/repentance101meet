import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_APP_URL = "https://repentance101ministry.com";

function loadEnvFile(filename) {
  const path = join(root, filename);
  if (!existsSync(path)) return {};
  const env = {};
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
  return env;
}

const keys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_NAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_NAME",
  "GOOGLE_YOUTUBE_CLIENT_ID",
  "GOOGLE_YOUTUBE_CLIENT_SECRET",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_URL",
  "NEXT_PUBLIC_LIVEKIT_URL",
];

const livekitKeys = new Set([
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_URL",
  "NEXT_PUBLIC_LIVEKIT_URL",
]);

const env = { ...loadEnvFile(".env.local"), ...loadEnvFile(".env") };

console.log("Syncing Vercel env vars for repentance101meet...\n");

for (const key of keys) {
  let value = env[key] ?? "";
  if (!value && (key.startsWith("LIVEKIT") || livekitKeys.has(key))) {
    console.log(`  skip (missing locally): ${key}`);
    continue;
  }
  if (!value) {
    console.log(`  skip (missing locally): ${key}`);
    continue;
  }

  console.log(`  + ${key}`);
  for (const target of ["production", "preview", "development"]) {
    let deployValue = value;
    if (
      (key === "NEXTAUTH_URL" || key === "NEXT_PUBLIC_APP_URL") &&
      target === "production" &&
      (!deployValue || deployValue.includes("localhost"))
    ) {
      deployValue = PRODUCTION_APP_URL;
    }

    const result = spawnSync(
      "npx",
      ["vercel", "env", "add", key, target, "--force", "--yes"],
      {
        cwd: root,
        input: deployValue,
        encoding: "utf8",
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    if (result.status !== 0) {
      console.error(`    failed ${key} (${target})`);
    }
  }
}

console.log("\nDone syncing env vars.");
