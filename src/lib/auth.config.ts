import type { NextAuthConfig } from "next-auth";
import {
  DEFAULT_SESSION_MAX_AGE_SEC,
  REMEMBER_ME_MAX_AGE_SEC,
} from "@/lib/remember-login";

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: REMEMBER_ME_MAX_AGE_SEC,
  },
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
        token.questionnaireCompleted = Boolean(
          (user as { questionnaireCompleted?: boolean }).questionnaireCompleted,
        );

        const rememberMe = (user as { rememberMe?: boolean }).rememberMe === true;
        token.rememberMe = rememberMe;
        const maxAge = rememberMe ? REMEMBER_ME_MAX_AGE_SEC : DEFAULT_SESSION_MAX_AGE_SEC;
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
      }

      if (trigger === "update" && session) {
        token.name = session.name ?? token.name;
        token.avatarUrl = session.avatarUrl ?? token.avatarUrl;
        token.status = (session.status ?? token.status) as
          | "PENDING"
          | "APPROVED"
          | "REJECTED"
          | undefined;
        if (typeof session.questionnaireCompleted === "boolean") {
          token.questionnaireCompleted = session.questionnaireCompleted;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "MEMBER";
        session.user.status = token.status as "PENDING" | "APPROVED" | "REJECTED";
        session.user.avatarUrl = token.avatarUrl as string | null | undefined;
        session.user.questionnaireCompleted = token.questionnaireCompleted === true;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
