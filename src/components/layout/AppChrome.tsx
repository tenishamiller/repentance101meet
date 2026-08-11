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
            ? "flex min-h-0 flex-1 flex-col overflow-hidden h-[calc(100svh-4.5rem)] max-h-[calc(100svh-4.5rem)] sm:h-[calc(100svh-5rem)] sm:max-h-[calc(100svh-5rem)] mobile-immersive-main"
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
