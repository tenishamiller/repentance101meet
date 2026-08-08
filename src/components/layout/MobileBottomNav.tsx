"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  Home,
  MessageCircle,
  MoreHorizontal,
  Radio,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  match?: (path: string) => boolean;
  adminOnly?: boolean;
  memberOnly?: boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/messages",
    label: "Messages",
    icon: MessageCircle,
    match: (p) => p.startsWith("/messages"),
    memberOnly: true,
  },
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    match: (p) => p === "/dashboard" || p === "/",
  },
  {
    href: "/livestream",
    label: "Live",
    icon: Radio,
    match: (p) => p.startsWith("/livestream") || p.startsWith("/meeting"),
  },
  {
    href: "/channels/general",
    label: "Chat",
    icon: MessageCircle,
    match: (p) => p.startsWith("/channels/"),
    memberOnly: true,
  },
  {
    href: "/personal-ministry",
    label: "Ministry",
    icon: Heart,
    match: (p) => p.startsWith("/personal-ministry"),
    memberOnly: true,
  },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    match: (p) => p.startsWith("/admin"),
    adminOnly: true,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const isApproved =
    session?.user?.status === "APPROVED" || session?.user?.role === "ADMIN";
  const isPending = session?.user?.status === "PENDING";

  if (isPending) {
    return (
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-cream/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-center px-2 py-2">
          <Link
            href="/messages"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
              pathname.startsWith("/messages") ? "text-burgundy" : "text-burgundy/55",
            )}
          >
            <MessageCircle className="h-5 w-5" />
            Messages
          </Link>
        </div>
      </nav>
    );
  }

  const visibleItems = ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.memberOnly && !isApproved) return false;
    return true;
  }).slice(0, 4);

  function isActive(item: NavItem) {
    return item.match ? item.match(pathname) : pathname === item.href;
  }

  if (!session?.user) {
    return (
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-cream/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <Link
            href="/login"
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold text-burgundy/70"
          >
            <Home className="h-5 w-5" />
            Login
          </Link>
          <Link
            href="/signup"
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold text-gold-muted"
          >
            <Heart className="h-5 w-5" />
            Join
          </Link>
          <Link
            href="/livestream"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold",
              pathname.startsWith("/livestream") ? "text-burgundy" : "text-burgundy/70",
            )}
          >
            <Radio className="h-5 w-5" />
            Live
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-50 bg-burgundy-deep/40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-2xl border border-gold/30 bg-cream p-3 shadow-xl md:hidden">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-burgundy/50">
            More
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/channels/guidelines"
              onClick={() => setMoreOpen(false)}
              className="rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
            >
              Guidelines
            </Link>
            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            {!isAdmin && isApproved && (
              <Link
                href="/channels/general"
                onClick={() => setMoreOpen(false)}
                className="rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
              >
                Member Chat
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-cream/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition",
                  active ? "text-burgundy" : "text-burgundy/55",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-gold-muted")} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold",
              moreOpen ? "text-burgundy" : "text-burgundy/55",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
