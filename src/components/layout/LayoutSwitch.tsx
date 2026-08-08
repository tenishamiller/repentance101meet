"use client";

import { usePathname } from "next/navigation";
import { isMobileAppPath } from "@/lib/mobile-paths";

type Props = {
  desktop: React.ReactNode;
  mobile: React.ReactNode;
};

/** Picks mobile or desktop app shell based on /m routes. */
export function LayoutSwitch({ desktop, mobile }: Props) {
  const pathname = usePathname();
  return isMobileAppPath(pathname) ? mobile : desktop;
}
