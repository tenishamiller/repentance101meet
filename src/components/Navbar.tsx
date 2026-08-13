import Link from "next/link";
import { auth } from "@/lib/auth";
import { SiteBrandMark } from "@/components/SiteBrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { SignOutButton } from "@/components/SignOutButton";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="site-theme navbar-brand sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-4 sm:py-4">
        <SiteBrandMark size="md" />

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {[
            { href: "/livestream", label: "Live Meeting", highlight: true },
            { href: "/channels/guidelines", label: "Guidelines" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.highlight
                  ? "rounded-lg bg-burgundy px-3 py-2 text-sm font-semibold text-cream shadow-sm transition hover:bg-burgundy-dark"
                  : "rounded-lg px-3 py-2 text-burgundy/80 transition hover:bg-gold/10 hover:text-burgundy"
              }
            >
              {item.label}
            </Link>
          ))}
          {(session?.user?.status === "APPROVED" || session?.user?.role === "ADMIN") && (
            <>
              {session.user.role !== "ADMIN" && (
                <Link
                  href="/messages"
                  className="rounded-lg px-3 py-2 text-burgundy/80 transition hover:bg-gold/10 hover:text-burgundy"
                >
                  Messages
                </Link>
              )}
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-2 text-burgundy/80 transition hover:bg-gold/10 hover:text-burgundy"
              >
                Dashboard
              </Link>
            </>
          )}
          <div className="flex items-center gap-1">
            <Link
              href="/giving"
              className="rounded-lg px-3 py-2 text-burgundy/80 transition hover:bg-gold/10 hover:text-burgundy"
            >
              Give
            </Link>
            <ThemeToggle />
          </div>
          {session?.user?.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="rounded-lg border border-gold/40 bg-gold/15 px-3 py-2 font-semibold text-burgundy transition hover:bg-gold/25"
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <MobileNavDrawer />
          {session?.user ? (
            <>
              <UserAvatar
                userId={session.user.id}
                name={session.user.name ?? "Member"}
                avatarUrl={session.user.avatarUrl}
                size="md"
              />
              <Link
                href="/settings"
                className="hidden rounded-lg px-3 py-2 text-sm text-burgundy/70 transition hover:bg-gold/10 sm:block"
              >
                Settings
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-burgundy transition hover:bg-gold/10"
              >
                Login
              </Link>
              <Link href="/signup" className="btn-primary !px-4 !py-2 text-sm">
                Join Ministry
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
