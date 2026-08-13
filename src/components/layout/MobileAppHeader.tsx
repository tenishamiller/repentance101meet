"use client";

import Link from "next/link";
import { SiteBrandMark } from "@/components/SiteBrandMark";
import { UserAvatar } from "@/components/UserAvatar";
import { SignOutButton } from "@/components/SignOutButton";
import { useSession } from "next-auth/react";

export function MobileAppHeader() {
  const { data: session } = useSession();

  return (
    <header className="site-theme navbar-brand sticky top-0 z-50">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-1">
          <SiteBrandMark size="sm" href="/m" showText={false} />
          <Link href="/m" className="font-serif text-sm font-bold text-burgundy">
            Mobile
          </Link>
        </div>
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
