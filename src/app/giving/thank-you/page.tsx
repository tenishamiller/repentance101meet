import Link from "next/link";
import { Heart } from "lucide-react";
import { MINISTRY_NAME } from "@/lib/brand";

export default function GivingThankYouPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-burgundy">
        <Heart className="h-7 w-7 fill-current" />
      </span>
      <h1 className="mt-6 font-serif text-4xl font-bold text-burgundy">Thank you</h1>
      <p className="mt-4 text-lg leading-relaxed text-burgundy/75">
        Thank you for supporting {MINISTRY_NAME}. We ask God to bless you a
        hundredfold for all that you have blessed this ministry.
      </p>
      <Link href="/livestream" className="btn-primary mt-8">
        Join the live meeting
      </Link>
    </div>
  );
}
