import { cn } from "@/lib/utils";

type BrandDividerProps = {
  className?: string;
  light?: boolean;
};

/** Ornamental gold rule — echoes the logo's fleur-de-lis dividers */
export function BrandDivider({ className, light = false }: BrandDividerProps) {
  return (
    <div
      className={cn("flex items-center gap-3", className)}
      aria-hidden
    >
      <span
        className={cn(
          "h-px flex-1",
          light ? "bg-gold-light/40" : "bg-gold/30",
        )}
      />
      <span
        className={cn(
          "font-serif text-xs tracking-widest",
          light ? "text-gold-light" : "text-gold",
        )}
      >
        ✦
      </span>
      <span
        className={cn(
          "h-px flex-1",
          light ? "bg-gold-light/40" : "bg-gold/30",
        )}
      />
    </div>
  );
}
