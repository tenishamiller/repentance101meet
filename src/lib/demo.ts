/** Demo accounts for testing — also seeded in prisma/seed.ts */
export const DEMO_ACCOUNTS = {
  admin: {
    label: "Norman Miller (Admin)",
    email: "norman@repentance101meet.com",
    password: "NormanAdmin2026!",
    description: "Full admin — start meetings, approve members",
  },
  member: {
    label: "Demo Member",
    email: "demo@repentance101meet.com",
    password: "DemoMember2026!",
    description: "Approved member — join channels & live meetings",
  },
} as const;
