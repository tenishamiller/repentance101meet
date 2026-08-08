/** Routes that use full-screen immersive layout (no footer / bottom nav). */
export function isImmersiveRoute(pathname: string): boolean {
  if (pathname.startsWith("/meeting/") && pathname !== "/meeting") return true;
  if (/^\/personal-ministry\/[^/]+/.test(pathname)) return true;
  return false;
}

/** Routes where bottom nav should be hidden. */
export function hideBottomNav(pathname: string): boolean {
  if (isImmersiveRoute(pathname)) return true;
  if (pathname === "/login" || pathname === "/signup" || pathname === "/host") return true;
  return false;
}
