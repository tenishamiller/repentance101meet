"use client";

import { usePathname } from "next/navigation";
import { isMobileAppPath, MOBILE_PREFIX, mobileHref } from "@/lib/mobile-paths";

/** Returns "" for desktop routes or "/m" when inside the mobile app shell. */
export function useAppBase(): string {
  const pathname = usePathname();
  return isMobileAppPath(pathname) ? MOBILE_PREFIX : "";
}

/** Build an app-aware path (desktop or /m-prefixed). */
export function useAppPath(path: string): string {
  const base = useAppBase();
  return mobileHref(path, base === MOBILE_PREFIX);
}
