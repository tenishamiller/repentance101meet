/**
 * Deploy Repentance 101 to Vercel — personal account, separate from BraidAppt.
 *
 * Uses YOUR personal Vercel account (not the braid-appt team).
 * Set VERCEL_SCOPE in .env.local only if you need a specific team.
 *
 * Prerequisites:
 *   npx vercel login
 *   npm run setup:supabase   (creates .env)
 *
 * Usage: npm run deploy
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERCEL_PROJECT = "repentance101meet";
const PRODUCTION_APP_URL =
  process.env.PRODUCTION_APP_URL ?? "https://repentance101ministry.com";

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

function loadEnv() {
  return { ...loadEnvFile(".env.local"), ...loadEnvFile(".env") };
}

function vercelArgs(base) {
  const scope = process.env.VERCEL_SCOPE;
  return scope ? [...base, "--scope", scope] : base;
}

function run(cmd, args, input) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    input,
    encoding: "utf8",
    shell: true,
    stdio: input ? ["pipe", "inherit", "inherit"] : "inherit",
    env: { ...process.env, VERCEL_ORG_ID: undefined, VERCEL_PROJECT_ID: undefined },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const env = loadEnv();
Object.assign(process.env, env);

if (!env.DATABASE_URL) {
  console.error("Missing .env — run: npm run setup:supabase");
  process.exit(1);
}

console.log("=== Repentance 101 — Vercel deploy (separate from BraidAppt) ===\n");
console.log(`Project: ${VERCEL_PROJECT}`);
console.log(`Scope:   ${env.VERCEL_SCOPE ?? "your personal Vercel account"}\n`);

console.log("Linking Vercel project...");
run("npx", vercelArgs(["vercel", "link", "--yes", "--project", VERCEL_PROJECT]));

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
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_URL",
  "NEXT_PUBLIC_LIVEKIT_URL",
];

console.log("Setting environment variables (Repentance 101 project only)...");
for (const key of keys) {
  let value = env[key] ?? "";
  if (!value && key.startsWith("LIVEKIT")) continue;
  if (!value) continue;
  console.log(`  + ${key}`);
  for (const target of ["production", "preview", "development"]) {
    let deployValue = value;
    if (
      (key === "NEXTAUTH_URL" || key === "NEXT_PUBLIC_APP_URL") &&
      target === "production" &&
      (!deployValue || deployValue.includes("localhost"))
    ) {
      deployValue = PRODUCTION_APP_URL;
      console.log(`    → production uses ${PRODUCTION_APP_URL}`);
    }
    spawnSync(
      "npx",
      vercelArgs(["vercel", "env", "add", key, target, "--force"]),
      {
        cwd: root,
        input: deployValue,
        encoding: "utf8",
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  }
}

console.log("\nEnsuring Supabase storage bucket...");
run("node", ["scripts/ensure-storage-bucket.mjs"]);

console.log("\nDeploying...");
run("npx", vercelArgs(["vercel", "--prod", "--yes"]));

console.log(`
Done! Production NEXTAUTH_URL and NEXT_PUBLIC_APP_URL use ${PRODUCTION_APP_URL} (not localhost).
`);
