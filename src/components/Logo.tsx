import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  href?: string;
  /** Use on dark backgrounds (footer, hero) */
  inverted?: boolean;
};

const sizes = {
  sm: { img: 52, text: "text-base" },
  md: { img: 72, text: "text-xl" },
  lg: { img: 96, text: "text-2xl" },
  xl: { img: 120, text: "text-2xl" },
};

export function Logo({
  size = "md",
  showText = true,
  className,
  href = "/",
  inverted = false,
}: LogoProps) {
  const s = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full shadow-lg",
          inverted ? "seal-ring ring-offset-burgundy-deep" : "seal-ring ring-offset-cream",
        )}
      >
        <Image
          src="/brand/repentance101-logo.png"
          alt="Repentance 101 Ministry"
          width={s.img}
          height={s.img}
          className="object-cover"
          priority
        />
      </div>
      {showText && (
        <p
          className={cn(
            "font-serif font-bold leading-tight tracking-tight",
            s.text,
            inverted ? "text-cream" : "text-burgundy",
          )}
        >
          Repentance 101
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
