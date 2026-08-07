/**
 * Generate favicons from public/brand/repentance101-logo.png
 * Run: node scripts/generate-favicons.mjs
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logo = join(root, "public", "brand", "repentance101-logo.png");
const appDir = join(root, "src", "app");
const publicDir = join(root, "public");

await sharp(logo).resize(32, 32, { fit: "cover" }).png().toFile(join(appDir, "icon.png"));
await sharp(logo)
  .resize(180, 180, { fit: "cover" })
  .png()
  .toFile(join(appDir, "apple-icon.png"));
await sharp(logo).resize(192, 192, { fit: "cover" }).png().toFile(join(publicDir, "icon-192.png"));
await sharp(logo).resize(512, 512, { fit: "cover" }).png().toFile(join(publicDir, "icon-512.png"));

console.log("Favicons generated (icon.png, apple-icon.png, icon-192/512.png)");
