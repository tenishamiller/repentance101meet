import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/** Pending members may only use membership messages and onboarding ministry links. */
export function isPendingMember(session: Session | null): boolean {
  return (
    session?.user?.role === "MEMBER" && session.user.status === "PENDING"
  );
}

export function canPendingAccessPath(pathname: string): boolean {
  if (pathname === "/messages" || pathname.startsWith("/messages/")) return true;
  if (pathname === "/signup" || pathname.startsWith("/signup/")) return true;
  if (/^\/personal-ministry\/[^/]+/.test(pathname)) return true;
  if (pathname.startsWith("/api/messages")) return true;
  if (pathname.startsWith("/api/onboarding")) return true;
  if (pathname.startsWith("/api/private-ministry/")) return true;
  if (pathname.startsWith("/api/meetings/") && pathname.includes("/chat")) return true;
  if (pathname.startsWith("/api/meetings/") && pathname.includes("/signal")) return true;
  if (pathname.startsWith("/api/upload")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  return false;
}
