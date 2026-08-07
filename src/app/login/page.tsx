"use client";

import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { Video, User, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password, or account not approved.");
      return false;
    }

    router.push("/livestream");
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doLogin(email, password);
  }

  async function demoLogin(which: keyof typeof DEMO_ACCOUNTS) {
    const account = DEMO_ACCOUNTS[which];
    setEmail(account.email);
    setPassword(account.password);
    await doLogin(account.email, account.password);
  }

  return (
    <div className="mx-auto grid min-h-[75vh] max-w-4xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
      <div className="hidden text-center lg:block">
        <Image
          src="/brand/repentance101-logo.png"
          alt="Repentance 101"
          width={200}
          height={200}
          className="seal-ring mx-auto rounded-full ring-offset-cream"
        />
        <h2 className="mt-6 font-serif text-2xl font-bold text-burgundy">Repentance 101</h2>
        <BrandDivider className="mx-auto my-4 max-w-[200px]" />
        <p className="text-burgundy/70">{MINISTRY_NAME}</p>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-burgundy">Welcome Back</h1>
        <p className="mt-2 text-burgundy/70">Sign in to Repentance 101</p>

        <div className="mt-6 rounded-2xl border-2 border-dashed border-gold/50 bg-cream-dark/80 p-5">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-burgundy">
            Demo logins — tap to test
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => demoLogin("admin")}
              className="card-brand flex items-start gap-3 p-4 text-left transition hover:shadow-md disabled:opacity-60"
            >
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-gold-muted" />
              <div>
                <p className="font-semibold text-burgundy">{DEMO_ACCOUNTS.admin.label}</p>
                <p className="mt-0.5 text-xs text-burgundy/60">{DEMO_ACCOUNTS.admin.description}</p>
              </div>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => demoLogin("member")}
              className="card-brand flex items-start gap-3 p-4 text-left transition hover:shadow-md disabled:opacity-60"
            >
              <User className="mt-0.5 h-5 w-5 shrink-0 text-gold-muted" />
              <div>
                <p className="font-semibold text-burgundy">{DEMO_ACCOUNTS.member.label}</p>
                <p className="mt-0.5 text-xs text-burgundy/60">{DEMO_ACCOUNTS.member.description}</p>
              </div>
            </button>
          </div>
          <Link
            href="/livestream"
            className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-gold-muted hover:underline"
          >
            <Video className="h-4 w-4" />
            Go to Live Meeting Room (after login)
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-burgundy">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-burgundy">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-burgundy/70">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-gold-muted hover:underline">
            Request membership
          </Link>
        </p>
      </div>
    </div>
  );
}
