import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { CHANNELS } from "@/lib/utils";

const defaultContent = {
  guidelines: `# Welcome to Repentance 101

## Ministry Guidelines

Thank you for your interest in joining Repentance 101, taught by Norman.

### Before You Join
- Come with a humble heart ready to learn
- Respect all members and maintain confidentiality in private channels
- Attend live sessions when possible
- Raise your hand in meetings when you wish to speak

### Expectations
- Weekly participation in assigned channels when approved
- Accountability with your assigned partner when applicable
- Prayerful preparation before each teaching session

Norman will review all membership requests personally.`,
  livestream: `# Livestream Information

## Repentance 101 with Norman

**Teacher:** Norman  
**Ministry:** Repentance 101

### Upcoming Livestreams
- **Weekly Teaching:** Sundays at 7:00 PM EST
- **Q&A Sessions:** Wednesdays at 8:00 PM EST

### How to Join
1. Wait for Norman to start a meeting from the Admin Console
2. Use the special meeting link provided
3. Ensure your profile is complete with a photo

Check back here for schedule updates from Norman.`,
};

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "norman@repentance101meet.com";
  const password = process.env.ADMIN_PASSWORD ?? "NormanAdmin2026!";
  const name = process.env.ADMIN_NAME ?? "Norman";

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "APPROVED", name },
    create: {
      email,
      passwordHash,
      name,
      role: "ADMIN",
      status: "APPROVED",
    },
  });

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

  console.log("Seed complete!");
  console.log(`Admin login: ${email} / ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
