"use client";

import Link from "next/link";
import Image from "next/image";
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { RememberMeCheckbox, useRememberedEmail } from "@/components/auth/RememberMeField";

export function MemberLoginForm({ mobileApp = false }: { mobileApp?: boolean }) {
  const base = mobileApp ? "/m" : "";
  const { email, setEmail, rememberMe, setRememberMe, persistOnLogin } = useRememberedEmail();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        rememberMe: rememberMe ? "true" : "false",
        redirect: false,
        callbackUrl: `${base}/dashboard`,
      });

      if (result?.error || result?.ok === false) {
        const msgRes = await fetch("/api/auth/login-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });
        const msgData = msgRes.ok ? await msgRes.json() : null;
        setError(
          msgData?.message ??
            "Invalid email or password, or account not approved.",
        );
        setLoading(false);
        return;
      }

      persistOnLogin(normalizedEmail);

      const statusRes = await fetch("/api/onboarding/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status === "PENDING") {
          window.location.assign(
            statusData.questionnaireCompleted ? `${base}/messages` : `${base}/signup`,
          );
          return;
        }
      } else {
        const session = await getSession();
        if (session?.user?.status === "PENDING") {
          window.location.assign(
            session.user.questionnaireCompleted ? `${base}/messages` : `${base}/signup`,
          );
          return;
        }
      }

      window.location.assign(`${base}/dashboard`);
    } catch {
      setError("Could not sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[75vh] max-w-4xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
      <div className="hidden justify-center lg:flex">
        <Image
          src="/brand/repentance101-logo.png"
          alt="Repentance 101"
          width={200}
          height={200}
          className="seal-ring rounded-full ring-offset-cream"
        />
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-burgundy">Welcome Back</h1>
        <p className="mt-2 text-burgundy/70">Sign in to your member account</p>

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
              autoComplete="username"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <RememberMeCheckbox checked={rememberMe} onChange={setRememberMe} />
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-burgundy/70">
          Don&apos;t have an account?{" "}
          <Link href={`${base}/signup`} className="font-medium text-gold-muted hover:underline">
            Request membership
          </Link>
        </p>
      </div>
    </div>
  );
}
