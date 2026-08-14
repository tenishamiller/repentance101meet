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
import { mobileHref } from "@/lib/mobile-paths";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMembershipUnreadCount } from "@/hooks/useMembershipUnreadCount";
import { UnreadCountBadge } from "@/components/messages/UnreadCountBadge";

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

export function MobileBottomNav({ mobileApp = false }: { mobileApp?: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  function link(path: string) {
    return mobileHref(path, mobileApp);
  }

  function matchPath(path: string) {
    if (path.startsWith("/m/")) return path.slice(2);
    if (path === "/m") return "/";
    return path;
  }

  const normalizedPath = matchPath(pathname);
  const { unread: messageUnread } = useMembershipUnreadCount(10000);
  const navClass = mobileApp
    ? "mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-cream/95 backdrop-blur-md"
    : "mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-cream/95 backdrop-blur-md md:hidden";

  const isAdmin = session?.user?.role === "ADMIN";
  const isApproved =
    session?.user?.status === "APPROVED" || session?.user?.role === "ADMIN";
  const isPending = session?.user?.status === "PENDING";

  if (isPending) {
    return (
      <nav className={navClass}>
        <div className="mx-auto flex max-w-lg items-center justify-center px-2 py-2">
          <Link
            href={link("/messages")}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
              normalizedPath.startsWith("/messages") ? "text-burgundy" : "text-burgundy/55",
            )}
          >
            <span className="relative">
              <MessageCircle className="h-5 w-5" />
              <UnreadCountBadge
                count={normalizedPath.startsWith("/messages") ? 0 : messageUnread}
                className="ring-cream"
              />
            </span>
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
    return item.match ? item.match(normalizedPath) : normalizedPath === item.href;
  }

  if (!session?.user) {
    return (
      <nav className={navClass}>
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <Link
            href={link("/login")}
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold text-burgundy/70"
          >
            <Home className="h-5 w-5" />
            Login
          </Link>
          <Link
            href={link("/signup")}
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold text-gold-muted"
          >
            <Heart className="h-5 w-5" />
            Join
          </Link>
          <Link
            href={link("/livestream")}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold",
              normalizedPath.startsWith("/livestream") ? "text-burgundy" : "text-burgundy/70",
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
          className={cn("fixed inset-0 z-50 bg-burgundy-deep/40", !mobileApp && "md:hidden")}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div
          className={cn(
            "fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-2xl border border-gold/30 bg-cream p-3 shadow-xl",
            !mobileApp && "md:hidden",
          )}
        >
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-burgundy/50">
            More
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={link("/missed-it")}
              onClick={() => setMoreOpen(false)}
              className="rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
            >
              In case you missed it
            </Link>
            <div className="col-span-2 flex items-center gap-2 rounded-xl border border-gold/25 bg-cream-dark px-3 py-2">
              <Link
                href={link("/giving")}
                onClick={() => setMoreOpen(false)}
                className="flex-1 py-1 text-sm font-medium text-burgundy"
              >
                Give
              </Link>
              <ThemeToggle />
            </div>
            <Link
              href={link("/channels/guidelines")}
              onClick={() => setMoreOpen(false)}
              className="rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
            >
              Guidelines
            </Link>
            <Link
              href={link("/settings")}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            {!isAdmin && isApproved && (
              <Link
                href={link("/channels/general")}
                onClick={() => setMoreOpen(false)}
                className="rounded-xl border border-gold/25 bg-cream-dark px-3 py-3 text-sm font-medium text-burgundy"
              >
                Member Chat
              </Link>
            )}
            {isAdmin && (
              <Link
                href={link("/admin")}
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

      <nav className={navClass}>
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={link(item.href)}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition",
                  active ? "text-burgundy" : "text-burgundy/55",
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "text-gold-muted")} />
                  {item.href === "/messages" && !active && messageUnread > 0 && (
                    <UnreadCountBadge count={messageUnread} className="ring-cream" />
                  )}
                </span>
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
