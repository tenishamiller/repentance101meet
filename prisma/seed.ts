import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { CHANNELS } from "@/lib/utils";

const defaultContent = {
  guidelines: `# Welcome to Repentance 101

## Ministry Guidelines

Thank you for your interest in joining our community.

### Before You Join
- Come with a humble heart ready to learn
- Respect all members and maintain confidentiality in private channels
- Attend live sessions when possible
- Raise your hand in meetings when you wish to speak

### Expectations
- Weekly participation in assigned channels when approved
- Accountability with your assigned partner when applicable
- Prayerful preparation before each teaching session

Membership requests are reviewed personally.`,
  livestream: `# Livestream Schedule

## Weekly Sessions

### Regular Sessions
- **Sunday Teaching** — 7:00 PM EST
- **Wednesday Q&A** — 8:00 PM EST

### Meeting Room
When a live session starts, the **Join Live Meeting** button appears at the top of this page.

### Before You Join
- Complete your profile with a photo
- Find a quiet space with good internet
- Come ready to participate respectfully`,
};

async function upsertUser(
  email: string,
  password: string,
  name: string,
  role: "ADMIN" | "MEMBER",
  status: "APPROVED" | "PENDING",
) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { role, status, name, passwordHash },
    create: { email, passwordHash, name, role, status },
  });
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "Norman Miller";

  if (!adminEmail || !adminPassword) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running seed.");
  }

  await upsertUser(adminEmail, adminPassword, adminName, "ADMIN", "APPROVED");

  for (const channel of Object.values(CHANNELS)) {
    const content =
      channel.slug === "guidelines"
        ? defaultContent.guidelines
        : channel.slug === "livestream"
          ? defaultContent.livestream
          : null;

    await prisma.channel.upsert({
      where: { slug: channel.slug },
      update: {
        name: channel.name,
        description: channel.description,
        type: channel.type,
        content: content ?? undefined,
      },
      create: {
        slug: channel.slug,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        content,
      },
    });
  }

  console.log("\n=== Seed complete ===");
  console.log("Host admin login:", "/host");
  console.log("Member login:", "/login");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
