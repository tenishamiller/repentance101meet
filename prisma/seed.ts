import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { CHANNELS } from "@/lib/utils";

const DEMO_MEMBER = {
  email: "demo@repentance101meet.com",
  password: "DemoMember2026!",
};

const defaultContent = {
  guidelines: `# Welcome to Repentance 101

## Ministry Guidelines

Thank you for your interest in joining Repentance 101, taught by Norman Miller.

### Before You Join
- Come with a humble heart ready to learn
- Respect all members and maintain confidentiality in private channels
- Attend live sessions when possible
- Raise your hand in meetings when you wish to speak

### Expectations
- Weekly participation in assigned channels when approved
- Accountability with your assigned partner when applicable
- Prayerful preparation before each teaching session

Norman Miller will review all membership requests personally.`,
  livestream: `# Livestream Schedule

## Weekly with Norman Miller

### Regular Sessions
- **Sunday Teaching** — 7:00 PM EST
- **Wednesday Q&A** — 8:00 PM EST

### Meeting Room
When Norman starts a live session, the **Join Live Meeting** button appears at the top of this page. Members meet together with video, audio, and chat.

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
  const adminEmail = process.env.ADMIN_EMAIL ?? "norman@repentance101meet.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "NormanAdmin2026!";
  const adminName = process.env.ADMIN_NAME ?? "Norman Miller";

  const admin = await upsertUser(
    adminEmail,
    adminPassword,
    adminName,
    "ADMIN",
    "APPROVED",
  );

  const demoMember = await upsertUser(
    DEMO_MEMBER.email,
    DEMO_MEMBER.password,
    "Demo Member",
    "MEMBER",
    "APPROVED",
  );

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

  const allChannels = await prisma.channel.findMany();
  for (const ch of allChannels) {
    if (ch.type === "PUBLIC") continue;
    await prisma.channelMembership.upsert({
      where: {
        userId_channelId: { userId: demoMember.id, channelId: ch.id },
      },
      update: { status: "APPROVED" },
      create: {
        userId: demoMember.id,
        channelId: ch.id,
        status: "APPROVED",
      },
    });
  }

  // Demo LIVE meeting for testing — token: demolive101
  await prisma.meeting.upsert({
    where: { linkToken: "demolive101" },
    update: {
      title: "Repentance 101 — Live Teaching (Demo)",
      status: "LIVE",
      livekitRoom: "repentance101-demolive101",
      startedAt: new Date(),
      createdById: admin.id,
    },
    create: {
      title: "Repentance 101 — Live Teaching (Demo)",
      linkToken: "demolive101",
      status: "LIVE",
      livekitRoom: "repentance101-demolive101",
      startedAt: new Date(),
      createdById: admin.id,
    },
  });

  console.log("\n=== Seed complete ===\n");
  console.log("ADMIN:", adminEmail, "/", adminPassword);
  console.log("DEMO MEMBER:", DEMO_MEMBER.email, "/", DEMO_MEMBER.password);
  console.log("\nLive Meeting Room: /livestream");
  console.log("Demo meeting join: /meeting/demolive101");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
