import { getCheckoutReturnUrl, getStripe } from "@/lib/stripe";
import { MINISTRY_NAME } from "@/lib/brand";

const MIN_CENTS = 100;
const MAX_CENTS = 1_000_000;

function integrationId() {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `r101_giving_${suffix}`;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return Response.json(
      { error: "Giving is not connected yet. Please try again soon." },
      { status: 503 },
    );
  }

  let body: { amount?: unknown; frequency?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const dollars = typeof body.amount === "number" ? body.amount : Number(body.amount);
  if (!Number.isFinite(dollars)) {
    return Response.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const cents = Math.round(dollars * 100);
  if (cents < MIN_CENTS || cents > MAX_CENTS) {
    return Response.json({ error: "Amount must be between $1 and $10,000." }, { status: 400 });
  }

  const monthly = body.frequency === "monthly";
  const appUrl = getCheckoutReturnUrl();
  const productName = monthly
    ? `Monthly gift to ${MINISTRY_NAME}`
    : `Gift to ${MINISTRY_NAME}`;

  const session = await stripe.checkout.sessions.create({
    mode: monthly ? "subscription" : "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: productName },
          unit_amount: cents,
          ...(monthly ? { recurring: { interval: "month" as const } } : {}),
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/giving/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/giving`,
    integration_identifier: integrationId(),
    ...(monthly ? {} : { submit_type: "donate" as const }),
  });

  if (!session.url) {
    return Response.json({ error: "Could not start checkout." }, { status: 500 });
  }

  return Response.json({ url: session.url });
}
