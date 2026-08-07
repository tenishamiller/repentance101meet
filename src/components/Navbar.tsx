import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserAvatar } from "@/components/UserAvatar";
import { SignOutButton } from "@/components/SignOutButton";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
            R101
          </div>
          <div>
            <p className="font-serif text-lg font-semibold text-stone-900">
              Repentance 101
            </p>
            <p className="text-xs text-stone-500">Ministry of Norman</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-stone-700 md:flex">
          <Link href="/channels/guidelines" className="hover:text-amber-700">
            Guidelines
          </Link>
          <Link href="/channels/livestream" className="hover:text-amber-700">
            Livestream
          </Link>
          {session?.user?.status === "APPROVED" || session?.user?.role === "ADMIN" ? (
            <>
              <Link href="/dashboard" className="hover:text-amber-700">
                Dashboard
              </Link>
              <Link href="/channels/general" className="hover:text-amber-700">
                General Chat
              </Link>
            </>
          ) : null}
          {session?.user?.role === "ADMIN" ? (
            <Link href="/admin" className="font-semibold text-amber-700 hover:text-amber-800">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              <UserAvatar
                userId={session.user.id}
                name={session.user.name ?? "Member"}
                avatarUrl={session.user.avatarUrl}
                size="sm"
              />
              <Link
                href="/settings"
                className="hidden text-sm text-stone-600 hover:text-amber-700 sm:block"
              >
                Settings
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Join Ministry
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
