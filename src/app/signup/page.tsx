"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MINISTRY_LEADER } from "@/lib/brand";
import { BrandDivider } from "@/components/BrandDivider";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      return;
    }

    setSuccess(data.message);
    setTimeout(() => router.push("/login"), 3000);
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
        <h2 className="mt-6 font-serif text-2xl font-bold text-burgundy">Join the Ministry</h2>
        <BrandDivider className="mx-auto my-4 max-w-[200px]" />
        <p className="max-w-xs mx-auto text-sm leading-relaxed text-burgundy/70">
          Every membership request is personally reviewed — a community built on trust and
          accountability.
        </p>
      </div>

      <div>
        <h1 className="font-serif text-3xl font-bold text-burgundy">Join Repentance 101</h1>
        <p className="mt-2 text-burgundy/70">
          Create your account. {MINISTRY_LEADER} will review your membership request.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg border border-burgundy/20 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-burgundy">
              {success}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-burgundy">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>
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
            <label className="mb-1 block text-sm font-medium text-burgundy">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Submitting..." : "Request Membership"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-burgundy/70">
          Already a member?{" "}
          <Link href="/login" className="font-medium text-gold-muted hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
