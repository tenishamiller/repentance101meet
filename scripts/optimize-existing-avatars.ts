import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  getObjectBuffer,
  storagePathFromPublicUrl,
  uploadObjectBuffer,
} from "../src/lib/object-storage";
import { optimizeAvatarImage } from "../src/lib/optimize-image";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const users = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, name: true, avatarUrl: true },
  });

  for (const user of users) {
    const storagePath = storagePathFromPublicUrl(user.avatarUrl);
    if (!storagePath) {
      console.log(`skip ${user.name}: not object storage`);
      continue;
    }

    const obj = await getObjectBuffer(storagePath);
    if (!obj) {
      console.log(`missing ${user.name}: ${storagePath}`);
      continue;
    }

    const optimized = await optimizeAvatarImage(obj.buffer, obj.contentType);
    await uploadObjectBuffer({
      storagePath,
      buffer: optimized.buffer,
      contentType: optimized.contentType,
    });
    console.log(
      `${user.name}: ${obj.buffer.length} bytes -> ${optimized.buffer.length} bytes (${storagePath})`,
    );
  }
}

try {
  await main();
} finally {
  await prisma.$disconnect();
  await pool.end();
}
