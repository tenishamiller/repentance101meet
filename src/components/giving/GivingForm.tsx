"use client";

import { useEffect, useState } from "react";
import { CreditCard, Heart } from "lucide-react";
import { PayPalDonateButton } from "@/components/giving/PayPalDonateButton";
import {
  GIVING_PRESETS,
  type GivingFrequency,
  type GivingMethod,
} from "@/lib/giving";

export function GivingForm() {
  const [amount, setAmount] = useState<number | "custom">(25);
  const [custom, setCustom] = useState("");
  const [frequency, setFrequency] = useState<GivingFrequency>("once");
  const [method, setMethod] = useState<GivingMethod>("paypal");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dollars = amount === "custom" ? Number(custom) : amount;

  useEffect(() => {
    if (frequency === "monthly" && method === "paypal") {
      setMethod("stripe");
    }
  }, [frequency, method]);

  async function onStripeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(dollars) || dollars < 1) {
      setError("Enter an amount of at least $1.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/giving/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: dollars, frequency }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start card checkout. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start card checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-gold/30 bg-cream p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex gap-2 rounded-xl bg-burgundy/5 p-1">
        {(
          [
            ["once", "One time"],
            ["monthly", "Monthly"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFrequency(value)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
              frequency === value
                ? "bg-burgundy text-cream shadow"
                : "text-burgundy/70 hover:bg-gold/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-sm font-semibold text-burgundy">Choose an amount</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GIVING_PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setAmount(value)}
            className={`rounded-xl border py-3 text-lg font-semibold transition ${
              amount === value
                ? "border-gold bg-gold/20 text-burgundy"
                : "border-gold/25 bg-white text-burgundy/80 hover:border-gold"
            }`}
          >
            ${value}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-burgundy">Other amount</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-burgundy/50">
            $
          </span>
          <input
            type="number"
            min={1}
            max={10000}
            step="1"
            inputMode="decimal"
            placeholder="0"
            value={amount === "custom" ? custom : ""}
            onChange={(e) => {
              setAmount("custom");
              setCustom(e.target.value);
            }}
            onFocus={() => setAmount("custom")}
            className="w-full rounded-xl border border-gold/30 bg-white py-3 pl-8 pr-3 text-burgundy outline-none focus:border-gold"
          />
        </div>
      </label>

      <div className="mt-6 flex gap-2 rounded-xl bg-burgundy/5 p-1">
        <button
          type="button"
          onClick={() => setMethod("paypal")}
          disabled={frequency === "monthly"}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
            method === "paypal"
              ? "bg-burgundy text-cream shadow"
              : "text-burgundy/70 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          PayPal
        </button>
        <button
          type="button"
          onClick={() => setMethod("stripe")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
            method === "stripe"
              ? "bg-burgundy text-cream shadow"
              : "text-burgundy/70 hover:bg-gold/10"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Card
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-burgundy/20 bg-burgundy/5 px-3 py-2 text-sm text-burgundy">
          {error}
        </p>
      )}

      {method === "paypal" ? (
        <PayPalDonateButton dollars={dollars} frequency={frequency} />
      ) : (
        <form onSubmit={onStripeSubmit} className="mt-6">
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
            <span className="inline-flex items-center justify-center gap-2">
              <Heart className="h-4 w-4 fill-current" />
              {busy
                ? "Opening card checkout…"
                : frequency === "monthly"
                  ? `Give $${Number.isFinite(dollars) ? dollars : "—"} monthly with card`
                  : `Give $${Number.isFinite(dollars) ? dollars : "—"} with card`}
            </span>
          </button>
          <p className="mt-3 text-center text-xs text-burgundy/50">
            Secure card checkout through Stripe. Cancel monthly gifts anytime.
          </p>
        </form>
      )}
    </div>
  );
}
