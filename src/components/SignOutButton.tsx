"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg border border-gold/40 px-3 py-2 text-sm text-burgundy/70 transition hover:bg-gold/10"
    >
      Sign Out
    </button>
  );
}
