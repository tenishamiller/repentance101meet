import { MINISTRY_NAME } from "@/lib/brand";

/** Host PayPal account for one-time gifts (popup stays on this site). */
export const GIVING_PAYPAL_EMAIL = "morewretch@gmail.com";

export const GIVING_PRESETS = [10, 25, 50, 100] as const;

export function givingItemName() {
  return `Gift to ${MINISTRY_NAME}`;
}

export function formatGivingAmount(dollars: number) {
  return dollars.toFixed(2);
}
