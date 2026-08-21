"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { MINISTRY_NAME } from "@/lib/brand";

export function ForgotPasswordForm({ mobileApp = false }: { mobileApp?: boolean }) {
  const base = mobileApp ? "/m" : "";
  const searchParams = useSearchParams();
  const fromHost = searchParams.get("from") === "host";
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mobileApp, fromHost }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not send reset email.");
        setLoading(false);
        return;
      }

      setMessage(
        typeof data.message === "string"
          ? data.message
          : "If an account exists for that email, we sent a link to reset your password.",
      );
      setLoading(false);
    } catch {
      setError("Could not send reset email. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[75vh] max-w-4xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
      <div className="hidden justify-center lg:flex">
        <Image
          src="/brand/repentance101-logo.png"
          alt={MINISTRY_NAME}
          width={200}
          height={200}
          className="seal-ring rounded-full ring-offset-cream"
        />
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-burgundy">Forgot password</h1>
        <p className="mt-2 text-burgundy/70">
          Enter your email and we&apos;ll send a link to reset your password. This works for
          members and admin accounts.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-burgundy">
              {message}
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
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-burgundy/70">
          {fromHost ? (
            <>
              Back to{" "}
              <Link href={`${base}/host`} className="font-medium text-gold-muted hover:underline">
                Host Portal
              </Link>
            </>
          ) : (
            <>
              Back to{" "}
              <Link href={`${base}/login`} className="font-medium text-gold-muted hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
