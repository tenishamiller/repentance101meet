import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { isUserPendingDeletion } from "@/lib/user-deletion-shared";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            avatarUrl: true,
            passwordHash: true,
            deletedAt: true,
            purgeAt: true,
            questionnaireCompletedAt: true,
          },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash,
        );
        if (!valid) return null;

        if (isUserPendingDeletion(user)) return null;

        if (user.status === "REJECTED") return null;

        const rememberMe = String(credentials.rememberMe ?? "") === "true";

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
          rememberMe,
          questionnaireCompleted: Boolean(user.questionnaireCompletedAt),
        };
      },
    }),
  ],
});

/** Session that is still allowed to call APIs (not deleted or rejected). */
export async function getActiveSession() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null as null,
      unauthorized: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true, status: true },
  });

  if (!user || user.deletedAt || user.status === "REJECTED") {
    return {
      session: null as null,
      unauthorized: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  session.user.status = user.status;
  return { session, unauthorized: null };
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireApprovedUser() {
  const session = await requireAuth();
  if (session.user.status !== "APPROVED" && session.user.role !== "ADMIN") {
    throw new Error("Account pending approval");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
  return session;
}
