/**
 * Vercel production build — runs migrations then Next.js build.
 * Recovers when MeetingSignal was created via db push before migrate deploy.
 */
import { spawnSync } from "node:child_process";

function run(command, args) {
  const label = [command, ...args].join(" ");
  console.log(`> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return result.status ?? 1;
}

function main() {
  let code = run("npx", ["prisma", "generate"]);
  if (code !== 0) process.exit(code);

  code = run("npx", ["prisma", "migrate", "deploy"]);
  if (code !== 0) {
    console.log(
      "\nMigration deploy failed — resolving livestream_signals if table already exists from db push...\n",
    );
    run("npx", [
      "prisma",
      "migrate",
      "resolve",
      "--applied",
      "20260807140000_livestream_signals",
    ]);
    code = run("npx", ["prisma", "migrate", "deploy"]);
  }

  if (code !== 0) {
    console.error("\nPrisma migrate deploy failed. Check DIRECT_URL on Vercel.\n");
    process.exit(code);
  }

  code = run("npx", ["next", "build"]);
  process.exit(code);
}

main();
