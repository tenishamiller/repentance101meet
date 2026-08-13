import { MINISTRY_NAME } from "@/lib/brand";

/** Host PayPal account for one-time gifts (popup stays on this site). */
export const GIVING_PAYPAL_EMAIL = "morewretch@gmail.com";

export const GIVING_PRESETS = [10, 25, 50, 100] as const;

export type GivingFrequency = "once" | "monthly";
export type GivingMethod = "paypal" | "stripe";

export function givingItemName(frequency: GivingFrequency) {
  return frequency === "monthly"
    ? `Monthly gift to ${MINISTRY_NAME}`
    : `Gift to ${MINISTRY_NAME}`;
}

export function formatGivingAmount(dollars: number) {
  return dollars.toFixed(2);
}
