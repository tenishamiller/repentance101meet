import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MEMBER";
      status: "PENDING" | "APPROVED" | "REJECTED";
      avatarUrl?: string | null;
      questionnaireCompleted?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "MEMBER";
    status?: "PENDING" | "APPROVED" | "REJECTED";
    avatarUrl?: string | null;
    rememberMe?: boolean;
    questionnaireCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "MEMBER";
    status?: "PENDING" | "APPROVED" | "REJECTED";
    avatarUrl?: string | null;
    rememberMe?: boolean;
    questionnaireCompleted?: boolean;
  }
}

export {};
