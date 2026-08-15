/** Host PayPal account for one-time gifts. */
export const GIVING_PAYPAL_EMAIL = "morewretch@gmail.com";

export const GIVING_PRESETS = [10, 25, 50, 100] as const;

/** Shown on the Give page and sent as the PayPal donation item/message. */
export const GIVING_BLESSING_MESSAGE =
  "Lord Jesus, bless those who bless this ministry a hundredfold.";

export function givingItemName() {
  return GIVING_BLESSING_MESSAGE;
}

export function formatGivingAmount(dollars: number) {
  return dollars.toFixed(2);
}
