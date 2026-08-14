/**
 * Print Coolify-ready env blocks from local .env files (for copy/paste into Coolify UI).
 * Usage: node scripts/coolify-env.mjs [site]
 * Sites: repentance101 | braidappt | glory-goat | theseers
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SITES = {
  repentance101: {
    label: "Repentance 101 (repentance101ministry.com)",
    envFiles: [join(root, ".env.local"), join(root, ".env")],
    productionUrl: "https://repentance101ministry.com",
    keys: [
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
      "LIVEKIT_URL",
      "LIVEKIT_API_KEY",
      "LIVEKIT_API_SECRET",
      "NEXT_PUBLIC_LIVEKIT_URL",
    ],
    buildKeys: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_APP_NAME",
      "NEXT_PUBLIC_LIVEKIT_URL",
    ],
  },
  braidappt: {
    label: "BraidAppt (braidappt.com)",
    envFiles: [
      join(root, "..", "braidbook", ".env.local"),
      join(root, "..", "braidbook", ".env"),
    ],
    productionUrl: "https://braidappt.com",
    keys: [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_STRIPE_TEST_MODE",
      "NEXT_PUBLIC_SHOW_PLAYGROUND_LOGINS",
      "NEXT_PUBLIC_ADMIN_LOGIN_PATH",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "RESEND_INBOUND_WEBHOOK_SECRET",
      "EMAIL_REPLY_DOMAIN",
      "EMAIL_REPLY_SECRET",
      "SUPPORT_EMAIL_DOMAIN",
      "SUPPORT_EMAIL_FROM",
      "SUPPORT_NOTIFY_EMAIL",
      "CRON_SECRET",
      "ADMIN_ACCESS_SECRET",
      "OPS_PASSWORD_RESET_EMAIL",
    ],
    buildKeys: [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_STRIPE_TEST_MODE",
      "NEXT_PUBLIC_SHOW_PLAYGROUND_LOGINS",
      "NEXT_PUBLIC_ADMIN_LOGIN_PATH",
    ],
  },
  "glory-goat": {
    label: "Glory Goat Milk Soap (glorygoatmilksoap.com)",
    envFiles: [join(root, "..", "..", "goat-milk-website", ".env.local")],
    productionUrl: "https://glorygoatmilksoap.com",
    keys: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET"],
    buildKeys: [],
  },
  theseers: {
    label: "The Seers Connect (theseersconnect.com)",
    envFiles: [],
    productionUrl: "https://theseersconnect.com",
    keys: [],
    buildKeys: [],
  },
};

function loadEnvFile(path) {
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

function mergeEnvFiles(paths) {
  const merged = {};
  for (const p of paths) {
    Object.assign(merged, loadEnvFile(p));
  }
  return merged;
}

function printSite(siteId) {
  const site = SITES[siteId];
  if (!site) {
    console.error(`Unknown site: ${siteId}`);
    console.error(`Available: ${Object.keys(SITES).join(", ")}`);
    process.exit(1);
  }

  const env = mergeEnvFiles(site.envFiles);

  console.log(`# ${site.label}`);
  console.log(`# Coolify → Environment Variables (runtime)\n`);

  for (const key of site.keys) {
    let value = env[key] ?? "";
    if (
      (key === "NEXTAUTH_URL" || key === "NEXT_PUBLIC_APP_URL") &&
      site.productionUrl
    ) {
      value = value && !value.includes("localhost") ? value : site.productionUrl;
    }
    if (!value) {
      console.log(`# MISSING: ${key}`);
      continue;
    }
    console.log(`${key}=${value}`);
  }

  if (site.buildKeys.length > 0) {
    console.log(`\n# Coolify → Build Variables\n`);
    for (const key of site.buildKeys) {
      let value = env[key] ?? "";
      if (key === "NEXT_PUBLIC_APP_URL" && site.productionUrl) {
        value = value && !value.includes("localhost") ? value : site.productionUrl;
      }
      if (!value) {
        console.log(`# MISSING build: ${key}`);
        continue;
      }
      console.log(`${key}=${value}`);
    }
  }

  console.log("");
}

const arg = process.argv[2] ?? "all";

if (arg === "all") {
  for (const id of Object.keys(SITES)) {
    printSite(id);
    console.log("---\n");
  }
} else {
  printSite(arg);
}
