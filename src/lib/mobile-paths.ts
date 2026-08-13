export const MOBILE_PREFIX = "/m";

const DESKTOP_TO_MOBILE: Record<string, string> = {
  "/": "/m",
  "/login": "/m/login",
  "/signup": "/m/signup",
  "/host": "/m/host",
  "/dashboard": "/m/dashboard",
  "/messages": "/m/messages",
  "/livestream": "/m/livestream",
  "/settings": "/m/settings",
  "/admin": "/m/admin",
  "/personal-ministry": "/m/personal-ministry",
  "/giving": "/m/giving",
  "/missed-it": "/m/missed-it",
};

const SKIP_MOBILE_REDIRECT_PREFIXES = [
  "/api",
  "/_next",
  "/brand",
  MOBILE_PREFIX,
];

const SKIP_MOBILE_REDIRECT_EXACT = [
  "/apple-icon.png",
  "/icon.png",
  "/favicon.ico",
];

export function shouldSkipMobileRouting(pathname: string): boolean {
  if (SKIP_MOBILE_REDIRECT_EXACT.includes(pathname)) return true;
  return SKIP_MOBILE_REDIRECT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function toMobilePath(pathname: string): string | null {
  if (pathname.startsWith(`${MOBILE_PREFIX}/`) || pathname === MOBILE_PREFIX) {
    return pathname;
  }

  if (DESKTOP_TO_MOBILE[pathname]) {
    return DESKTOP_TO_MOBILE[pathname];
  }

  if (pathname.startsWith("/meeting/")) {
    return `${MOBILE_PREFIX}${pathname}`;
  }

  if (pathname.startsWith("/personal-ministry/")) {
    return `${MOBILE_PREFIX}${pathname}`;
  }

  if (pathname.startsWith("/channels/")) {
    return `${MOBILE_PREFIX}${pathname}`;
  }

  return null;
}

export function toDesktopPath(pathname: string): string {
  if (!isMobileAppPath(pathname)) return pathname;
  if (pathname === MOBILE_PREFIX) return "/";
  return pathname.slice(MOBILE_PREFIX.length) || "/";
}

export function isMobileAppPath(pathname: string): boolean {
  return pathname === MOBILE_PREFIX || pathname.startsWith(`${MOBILE_PREFIX}/`);
}

export function mobileHref(path: string, inMobileApp: boolean): string {
  if (!inMobileApp) return path;
  if (path.startsWith(MOBILE_PREFIX)) return path;
  return toMobilePath(path) ?? `${MOBILE_PREFIX}${path === "/" ? "" : path}`;
}
