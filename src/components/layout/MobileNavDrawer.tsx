"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isApproved =
    session?.user?.status === "APPROVED" || session?.user?.role === "ADMIN";
  const isAdmin = session?.user?.role === "ADMIN";
  const links = [
    { href: "/livestream", label: "Live Meeting", highlight: true },
    { href: "/channels/guidelines", label: "Guidelines" },
    ...(isApproved
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/channels/general", label: "Chat" },
          { href: "/personal-ministry", label: "Personal Ministry" },
        ]
      : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin Console", highlight: true }] : []),
    ...(session?.user
      ? [{ href: "/settings", label: "Settings" }]
      : [
          { href: "/login", label: "Login" },
          { href: "/signup", label: "Join Ministry", highlight: true },
        ]),
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gold/30 p-2 text-burgundy hover:bg-gold/10"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[60] bg-burgundy-deep/50"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[70] flex w-[min(100vw-3rem,20rem)] flex-col border-l border-gold/30 bg-cream shadow-2xl">
            <div className="flex items-center justify-between border-b border-gold/20 px-4 py-4">
              <p className="font-serif text-lg font-bold text-burgundy">Menu</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-burgundy/70 hover:bg-gold/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mb-1 block rounded-xl px-4 py-3 text-sm font-semibold transition",
                    link.highlight
                      ? "bg-burgundy text-cream"
                      : pathname === link.href || pathname.startsWith(`${link.href}/`)
                        ? "bg-gold/15 text-burgundy"
                        : "text-burgundy/80 hover:bg-cream-dark",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
