import { isMobileAppPath } from "@/lib/mobile-paths";

function stripMobilePrefix(pathname: string): string {
  if (!isMobileAppPath(pathname)) return pathname;
  if (pathname === "/m") return "/";
  return pathname.slice(2) || "/";
}

/** Routes that use full-screen immersive layout (no footer / bottom nav). */
export function isImmersiveRoute(pathname: string): boolean {
  const path = stripMobilePrefix(pathname);
  if (path.startsWith("/meeting/") && path !== "/meeting") return true;
  if (/^\/personal-ministry\/[^/]+/.test(path)) return true;
  return false;
}

/** Routes where bottom nav should be hidden on the responsive desktop shell. */
export function hideBottomNav(pathname: string): boolean {
  if (isMobileAppPath(pathname)) return true;
  if (isImmersiveRoute(pathname)) return true;
  const path = stripMobilePrefix(pathname);
  if (path === "/login" || path === "/signup" || path === "/host") return true;
  return false;
}
