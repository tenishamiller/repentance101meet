import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

/** Pending members may only use membership messages and onboarding ministry links. */
export function isPendingMember(session: Session | null): boolean {
  return (
    session?.user?.role === "MEMBER" && session.user.status === "PENDING"
  );
}

function normalizePath(pathname: string): string {
  if (pathname === "/m") return "/";
  if (pathname.startsWith("/m/")) return pathname.slice(2);
  return pathname;
}

export function pendingMemberLandingPath(
  questionnaireCompleted: boolean,
  mobileRoute: boolean,
): string {
  const desktopPath = questionnaireCompleted ? "/messages" : "/signup";
  if (!mobileRoute) return desktopPath;
  return desktopPath === "/signup" ? "/m/signup" : "/m/messages";
}

export function canPendingAccessPath(
  pathname: string,
  questionnaireCompleted = false,
): boolean {
  const path = normalizePath(pathname);
  if (path === "/signup" || path.startsWith("/signup/")) return true;
  if (path === "/questionnaire" || path.startsWith("/questionnaire/")) return true;
  if (
    questionnaireCompleted &&
    (path === "/messages" || path.startsWith("/messages/"))
  ) {
    return true;
  }
  if (/^\/personal-ministry\/[^/]+/.test(path)) return true;
  if (pathname.startsWith("/api/messages")) return true;
  if (pathname.startsWith("/api/onboarding")) return true;
  if (pathname.startsWith("/api/private-ministry/")) return true;
  if (pathname.startsWith("/api/meetings/") && pathname.includes("/chat")) return true;
  if (pathname.startsWith("/api/meetings/") && pathname.includes("/signal")) return true;
  if (pathname.startsWith("/api/upload")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  return false;
}
