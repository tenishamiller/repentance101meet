import Link from "next/link";
import { BrandSeal } from "@/components/BrandSeal";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  href?: string;
  /** Use on dark backgrounds (footer, hero) */
  inverted?: boolean;
};

const sizes = {
  sm: { img: 40, text: "text-base" },
  md: { img: 48, text: "text-lg" },
  lg: { img: 88, text: "text-2xl" },
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
    <div className={cn("flex shrink-0 items-center gap-3", className)}>
      <BrandSeal size={s.img} inverted={inverted} priority={size !== "lg"} />
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
      <Link href={href} className="group shrink-0 transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
