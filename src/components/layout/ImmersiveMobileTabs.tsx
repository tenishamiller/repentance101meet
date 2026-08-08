"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImmersiveTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type Props = {
  tabs: ImmersiveTab[];
  active: string;
  onChange: (id: string) => void;
};

export function ImmersiveMobileTabs({ tabs, active, onChange }: Props) {
  return (
    <nav
      className="mobile-tab-bar flex shrink-0 items-stretch border-t border-gold/30 bg-burgundy-dark lg:hidden"
      aria-label="Room sections"
    >
      {tabs.map(({ id, label, icon: Icon, badge }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition",
              isActive ? "bg-burgundy text-gold" : "text-gold-light/70 hover:bg-burgundy/80",
            )}
          >
            <span className="relative">
              <Icon className="h-5 w-5" />
              {badge != null && badge > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-burgundy-deep">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
