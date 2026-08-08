import { Laugh } from "lucide-react";
import { BrandDivider } from "@/components/BrandDivider";
import { getDailyDadJoke, getDailyDadJokeLabel } from "@/lib/dad-jokes";

export function DailyDadJoke() {
  const joke = getDailyDadJoke();
  const dateLabel = getDailyDadJokeLabel();

  return (
    <section className="mt-16">
      <div className="card-brand relative overflow-hidden border-2 border-gold/35 p-8 md:p-10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-burgundy/5 blur-2xl" />

        <div className="relative text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-burgundy">
            <Laugh className="h-4 w-4 text-gold-muted" aria-hidden />
            Dad Joke of the Day
          </div>

          <BrandDivider className="mx-auto my-4 max-w-xs" />
          <p className="text-sm font-medium text-burgundy/55">{dateLabel}</p>

          <blockquote className="mx-auto mt-6 max-w-2xl">
            <p className="font-serif text-xl leading-relaxed text-burgundy md:text-2xl">
              {joke.setup}
            </p>
            <p className="mt-4 font-serif text-xl font-semibold italic text-gold-muted md:text-2xl">
              {joke.punchline}
            </p>
          </blockquote>

          <p className="mt-6 text-sm text-burgundy/50">
            Come back tomorrow for a brand-new groaner. Same joke all day for everyone — fresh
            every morning.
          </p>
        </div>
      </div>
    </section>
  );
}
