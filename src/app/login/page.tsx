"use client";

import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { MINISTRY_NAME } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error || result?.ok === false) {
        setError("Invalid email or password, or account not approved.");
        setLoading(false);
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("Could not sign in. Please try again.");
      setLoading(false);
    }
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
