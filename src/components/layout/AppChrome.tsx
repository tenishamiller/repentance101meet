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
          "flex flex-1 flex-col",
          showBottomNav && "mobile-main-pad md:pb-0",
          immersive
            ? "h-[100dvh] min-h-0 overflow-hidden mobile-immersive-main"
            : undefined,
        )}
      >
        {children}
      </main>
      {!immersive && footer}
      {showBottomNav && <MobileBottomNav />}
    </>
  );
}
