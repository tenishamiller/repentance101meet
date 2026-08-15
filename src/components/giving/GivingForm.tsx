"use client";

import { useState } from "react";
import { PayPalDonateButton } from "@/components/giving/PayPalDonateButton";
import { GIVING_BLESSING_MESSAGE, GIVING_PRESETS } from "@/lib/giving";

export function GivingForm() {
  const [amount, setAmount] = useState<number | "custom">(25);
  const [custom, setCustom] = useState("");

  const dollars = amount === "custom" ? Number(custom) : amount;

  return (
    <div className="rounded-3xl border border-gold/30 bg-cream p-6 shadow-xl sm:p-8">
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

      <div className="mt-5 rounded-xl border border-gold/25 bg-cream-dark/80 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-burgundy/55">
          Donation message
        </p>
        <p className="mt-1 font-serif text-base leading-relaxed text-burgundy">
          {GIVING_BLESSING_MESSAGE}
        </p>
      </div>

      <PayPalDonateButton dollars={dollars} />
    </div>
  );
}
