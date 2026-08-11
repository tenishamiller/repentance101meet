import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const checks = [
  { email: "norman@repentance101ministry.com", password: process.env.ADMIN_PASSWORD ?? "NormanAdmin2026!" },
  { email: "demo@repentance101ministry.com", password: "DemoMember2026!" },
];

for (const { email, password } of checks) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`${email}: NOT FOUND`);
    continue;
  }
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  console.log(`${email}: role=${user.role} status=${user.status} passwordMatch=${passwordMatch}`);
}

await prisma.$disconnect();
await pool.end();
