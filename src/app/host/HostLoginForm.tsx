"use client";

import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";
import { Shield } from "lucide-react";
import { RememberMeCheckbox, useRememberedEmail } from "@/components/auth/RememberMeField";

export function HostLoginForm() {
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
        callbackUrl: "/admin",
      });

      if (result?.error || result?.ok === false) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      persistOnLogin(normalizedEmail);
      window.location.assign("/admin");
    } catch {
      setError("Could not sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[75vh] max-w-lg items-center px-4 py-12">
      <div className="card-brand p-8 shadow-lg">
        <div className="mb-6 text-center">
          <Image
            src="/brand/repentance101-logo.png"
            alt={MINISTRY_NAME}
            width={96}
            height={96}
            className="seal-ring mx-auto rounded-full ring-offset-cream"
          />
          <h1 className="mt-4 font-serif text-2xl font-bold text-burgundy">Host Portal</h1>
          <BrandDivider className="mx-auto my-3 max-w-[180px]" />
          <p className="flex items-center justify-center gap-2 text-sm text-burgundy/70">
            <Shield className="h-4 w-4 text-gold-muted" />
            {MINISTRY_NAME} — admin console
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="norman@repentance101ministry.com"
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
          <RememberMeCheckbox id="remember-me-host" checked={rememberMe} onChange={setRememberMe} />
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Signing in..." : "Enter Admin Console"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-burgundy/50">
          Members{" "}
          <Link href="/login" className="font-medium text-gold-muted hover:underline">
            sign in here
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
