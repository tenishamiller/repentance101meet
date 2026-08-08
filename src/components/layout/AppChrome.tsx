"use client";

import { usePathname } from "next/navigation";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { hideBottomNav, isImmersiveRoute } from "@/lib/mobile-routes";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AppChrome({ children, footer }: Props) {
  const pathname = usePathname();
  const immersive = isImmersiveRoute(pathname);
  const showBottomNav = !hideBottomNav(pathname);

  return (
    <>
      <main
        className={cn(
          "flex-1",
          showBottomNav && "mobile-main-pad md:pb-0",
          immersive && "mobile-immersive-main",
        )}
      >
        {children}
      </main>
      {!immersive && footer}
      {showBottomNav && <MobileBottomNav />}
    </>
  );
}
