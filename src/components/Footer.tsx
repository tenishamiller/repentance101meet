import Link from "next/link";
import { Heart, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BrandDivider } from "@/components/BrandDivider";
import { MINISTRY_NAME } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="footer-brand mt-auto hidden border-t-2 border-gold/30 text-cream-dark md:block">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <BrandDivider light className="mb-10" />

        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo size="sm" href={undefined} inverted className="mb-4" />
            <p className="text-sm leading-relaxed text-gold-light/80">
              A teaching ministry devoted to biblical repentance, community accountability,
              and walking in truth together.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold">
              Explore
            </h3>
            <ul className="space-y-2 text-sm text-cream-dark/90">
              {[
                { href: "/channels/guidelines", label: "Guidelines" },
                { href: "/livestream", label: "Live Meeting Room" },
                { href: "/personal-ministry", label: "Personal Ministry" },
                { href: "/signup", label: "Join the Ministry" },
                { href: "/login", label: "Member Login" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-gold-light">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-serif text-sm font-semibold uppercase tracking-wider text-gold">
              Scripture
            </h3>
            <blockquote className="border-l-2 border-gold/50 pl-4 text-sm italic leading-relaxed text-gold-light/90">
              &ldquo;Repent, for the kingdom of heaven is at hand.&rdquo;
              <footer className="mt-2 not-italic text-xs text-gold/80">
                — Matthew 4:17
              </footer>
            </blockquote>
          </div>
        </div>

        <BrandDivider light className="my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-gold-light/60 sm:flex-row">
          <p className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-gold" />
            repentance101ministry.com
          </p>
          <p className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-gold" />
            {MINISTRY_NAME} Ministry
          </p>
        </div>
      </div>
    </footer>
  );
}
