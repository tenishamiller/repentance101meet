"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Ban,
  BookOpen,
  Heart,
  Home,
  LayoutDashboard,
  MessageCircle,
  Radio,
  Shield,
  Users,
  Video,
} from "lucide-react";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { UserAvatar } from "@/components/UserAvatar";
import type { AdminTab } from "./types";

const NAV: { id: AdminTab; label: string; icon: typeof Home; description: string }[] = [
  { id: "overview", label: "Overview", icon: Home, description: "Dashboard & quick actions" },
  { id: "members", label: "Members", icon: Users, description: "Approvals & directory" },
  { id: "messages", label: "Messages", icon: MessageCircle, description: "Member conversations" },
  { id: "channels", label: "Channels", icon: LayoutDashboard, description: "Join requests & access" },
  { id: "livestream", label: "Livestream", icon: Radio, description: "Teaching room & recordings" },
  { id: "private", label: "Personal Ministry", icon: Heart, description: "Private 1-on-1 sessions" },
  { id: "blocks", label: "Block List", icon: Ban, description: "Manage blocked users" },
  { id: "content", label: "Site Content", icon: BookOpen, description: "Guidelines & schedule" },
];

type Props = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  badges: Partial<Record<AdminTab, number>>;
  children: React.ReactNode;
};

export function AdminShell({ activeTab, onTabChange, badges, children }: Props) {
  const { data: session } = useSession();
  const admin = session?.user;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      {/* Header */}
      <section className="hero-brand mb-6 overflow-hidden rounded-3xl px-4 py-6 sm:mb-8 sm:px-6 sm:py-8 md:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            {admin ? (
              <UserAvatar
                userId={admin.id}
                name={admin.name ?? "Admin"}
                avatarUrl={admin.avatarUrl}
                size="lg"
                className="ring-offset-burgundy-deep ring-4"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-gold/20" />
            )}
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-light">
                <Shield className="h-3.5 w-3.5" />
                Host Portal · {MINISTRY_NAME}
              </p>
              <h1 className="font-serif text-2xl font-bold text-cream sm:text-3xl md:text-4xl">
                Admin Console
              </h1>
              <p className="mt-1 text-gold-light/90">
                Manage members, meetings, channels, and ministry content
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/livestream"
              className="btn-secondary inline-flex items-center gap-2 !px-5 !py-2.5 text-sm"
            >
              <Video className="h-4 w-4" />
              Live Room
            </Link>
            <Link href="/dashboard" className="btn-secondary !px-5 !py-2.5 text-sm">
              ← Member View
            </Link>
            <Link href="/settings" className="btn-secondary inline-flex items-center gap-2 !px-5 !py-2.5 text-sm">
              Profile Photo
            </Link>
          </div>
        </div>
        <BrandDivider light className="my-6" />
      </section>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Mobile tab strip */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const badge = badges[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-burgundy bg-burgundy text-cream"
                    : "border-gold/30 bg-cream text-burgundy"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {badge != null && badge > 0 && (
                  <span className="rounded-full bg-gold px-1.5 text-[10px] font-bold text-burgundy-deep">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <nav className="card-brand sticky top-24 space-y-1 p-3">
            {NAV.map(({ id, label, icon: Icon, description }) => {
              const active = activeTab === id;
              const badge = badges[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? "bg-burgundy text-cream shadow-md"
                      : "text-burgundy hover:bg-cream-dark"
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-gold-light" : "text-gold-muted"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{label}</span>
                      {badge != null && badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            active ? "bg-gold text-burgundy-deep" : "bg-burgundy text-cream"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs ${active ? "text-gold-light/80" : "text-burgundy/55"}`}
                    >
                      {description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
