"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { UserAvatar } from "@/components/UserAvatar";
import { SignOutButton } from "@/components/SignOutButton";
import { useSession } from "next-auth/react";

export function MobileAppHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-gold/30 bg-cream/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2.5">
        <Link href="/m" className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="font-serif text-sm font-bold text-burgundy">Mobile</span>
        </Link>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <UserAvatar
                userId={session.user.id}
                name={session.user.name ?? "Member"}
                avatarUrl={session.user.avatarUrl}
                size="sm"
              />
              <SignOutButton />
            </>
          ) : (
            <Link href="/m/login" className="text-sm font-semibold text-burgundy">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
