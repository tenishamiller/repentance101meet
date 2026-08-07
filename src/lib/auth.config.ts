import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = ((user as { role?: string }).role ?? "MEMBER") as "ADMIN" | "MEMBER";
        token.status = ((user as { status?: string }).status ?? "PENDING") as
          | "PENDING"
          | "APPROVED"
          | "REJECTED";
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl;
      }

      if (trigger === "update" && session) {
        token.name = session.name ?? token.name;
        token.avatarUrl = session.avatarUrl ?? token.avatarUrl;
        token.status = (session.status ?? token.status) as
          | "PENDING"
          | "APPROVED"
          | "REJECTED"
          | undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "MEMBER";
        session.user.status = token.status as "PENDING" | "APPROVED" | "REJECTED";
        session.user.avatarUrl = token.avatarUrl as string | null | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
