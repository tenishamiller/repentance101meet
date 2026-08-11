"use client";

import { usePathname } from "next/navigation";
import { MobileAppHeader } from "@/components/layout/MobileAppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
};

function isImmersiveMobilePath(pathname: string): boolean {
  if (pathname.startsWith("/m/meeting/")) return true;
  if (/^\/m\/personal-ministry\/[^/]+/.test(pathname)) return true;
  if (pathname === "/m/login" || pathname === "/m/signup" || pathname === "/m/host") return true;
  return false;
}

export function MobileAppShell({ children }: Props) {
  const pathname = usePathname();
  const immersive = isImmersiveMobilePath(pathname);
  const showNav = !immersive;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      {!immersive && <MobileAppHeader />}
      <main
        className={cn(
          "flex flex-1 flex-col",
          immersive ? "h-[100dvh] min-h-0 overflow-hidden" : showNav && "mobile-main-pad",
        )}
      >
        {children}
      </main>
      {showNav && <MobileBottomNav mobileApp />}
    </div>
  );
}
