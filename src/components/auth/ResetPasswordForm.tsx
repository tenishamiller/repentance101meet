"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MINISTRY_NAME } from "@/lib/brand";

export function ResetPasswordForm({ mobileApp = false }: { mobileApp?: boolean }) {
  const base = mobileApp ? "/m" : "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const fromHost = searchParams.get("from") === "host";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!token) {
      setError("This reset link is invalid or has expired.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not reset password.");
        setLoading(false);
        return;
      }

      router.push(
        fromHost ? `${base}/host?reset=1` : `${base}/login?reset=1`,
      );
    } catch {
      setError("Could not reset password. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="card-brand p-8 text-center shadow-lg">
          <h1 className="font-serif text-2xl font-bold text-burgundy">Invalid reset link</h1>
          <p className="mt-3 text-sm text-burgundy/70">
            This password reset link is missing or has expired. Request a new one from the sign-in
            page.
          </p>
          <Link
            href={`${base}/forgot-password`}
            className="btn-primary mt-6 inline-flex"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
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
        <h1 className="font-serif text-3xl font-bold text-burgundy">Choose a new password</h1>
        <p className="mt-2 text-burgundy/70">
          Enter a new password for your {MINISTRY_NAME} account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
              {error}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-burgundy">New password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-burgundy">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Saving..." : "Update password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-burgundy/70">
          <Link href={`${base}/login`} className="font-medium text-gold-muted hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
