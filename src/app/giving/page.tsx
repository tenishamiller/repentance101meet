import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { BrandDivider } from "@/components/BrandDivider";
import { GivingForm } from "@/components/giving/GivingForm";
import { MINISTRY_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Give · ${MINISTRY_NAME}`,
  description: `Support ${MINISTRY_NAME} with a one-time gift through PayPal.`,
};

export default function GivingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      <section className="hero-brand relative overflow-hidden rounded-3xl px-6 py-12 text-cream shadow-2xl sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative max-w-xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold-light">
            <Heart className="h-3.5 w-3.5" />
            Giving
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
            Support the work
          </h1>
          <BrandDivider light className="my-4 max-w-xs" />
          <p className="text-lg leading-relaxed text-cream/90">
            Your gift helps {MINISTRY_NAME} keep live teaching, fellowship, and
            pastoral care going. Give with PayPal right on this page.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-10 max-w-lg">
        <GivingForm />
      </div>
    </div>
  );
}
