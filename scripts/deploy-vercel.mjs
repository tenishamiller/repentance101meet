/**
 * Vercel deploys are retired. Production is the DreamHost VPS only.
 *
 * On the VPS:
 *   cd ~/repentance101meet
 *   git pull origin master
 *   docker compose up -d --build
 *
 * Or: npm run deploy
 *
 * See DEPLOY-VPS.md
 */
console.error("Vercel is no longer used. Deploy on the DreamHost VPS only.");
console.error("");
console.error("On the VPS, run:");
console.error("  cd ~/repentance101meet");
console.error("  git pull origin master");
console.error("  docker compose up -d --build");
console.error("");
console.error("Or: npm run deploy");
console.error("See DEPLOY-VPS.md");
process.exit(1);
