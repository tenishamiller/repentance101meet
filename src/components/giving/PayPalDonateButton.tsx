"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  GIVING_PAYPAL_EMAIL,
  formatGivingAmount,
  givingItemName,
} from "@/lib/giving";

type DonateParams = {
  tx?: string;
  st?: string;
  amt?: string;
};

declare global {
  interface Window {
    PayPal?: {
      Donation: {
        Button: (options: {
          env?: string;
          business: string;
          amount?: string;
          currency_code?: string;
          item_name?: string;
          image?: { src: string; title?: string; alt?: string };
          onComplete?: (params: DonateParams) => void;
        }) => { render: (selector: string) => void };
      };
    };
  }
}

type Props = {
  dollars: number;
  disabled?: boolean;
};

export function PayPalDonateButton({ dollars, disabled = false }: Props) {
  const router = useRouter();
  const reactId = useId();
  const containerId = `paypal-donate-${reactId.replace(/:/g, "")}`;
  const renderedRef = useRef<string>("");
  const [sdkReady, setSdkReady] = useState(false);

  const valid = Number.isFinite(dollars) && dollars >= 1;
  const amountKey = valid ? formatGivingAmount(dollars) : "";

  useEffect(() => {
    if (!sdkReady || !valid || disabled) return;
    if (!window.PayPal?.Donation?.Button) return;

    const mountId = `${containerId}-mount`;
    const mount = document.getElementById(mountId);
    if (!mount) return;

    if (renderedRef.current === amountKey) return;
    renderedRef.current = amountKey;
    mount.innerHTML = "";

    window.PayPal.Donation.Button({
      business: GIVING_PAYPAL_EMAIL,
      amount: amountKey,
      currency_code: "USD",
      item_name: givingItemName(),
      image: {
        src: "https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif",
        title: "PayPal — The safer, easier way to pay online!",
        alt: "Donate with PayPal",
      },
      onComplete: () => {
        router.push("/giving/thank-you?provider=paypal");
      },
    }).render(`#${mountId}`);
  }, [amountKey, containerId, disabled, router, sdkReady, valid]);

  useEffect(() => {
    renderedRef.current = "";
  }, [amountKey, disabled]);

  return (
    <>
      <Script
        src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <div className="relative mt-6">
        <div
          className={`btn-primary pointer-events-none w-full text-center ${
            !valid || disabled ? "opacity-60" : ""
          }`}
          aria-hidden
        >
          Give ${valid ? amountKey : "—"} with PayPal
        </div>

        <div
          id={containerId}
          className={`absolute inset-0 overflow-hidden rounded-xl ${
            !valid || disabled ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <div
            id={`${containerId}-mount`}
            className="paypal-donate-overlay absolute inset-0 [&_img]:absolute [&_img]:inset-0 [&_img]:h-full [&_img]:w-full [&_img]:cursor-pointer [&_img]:opacity-0"
          />
        </div>
      </div>

      {!valid && (
        <p className="mt-2 text-center text-xs text-burgundy/50">
          Choose an amount of at least $1 to enable PayPal.
        </p>
      )}
    </>
  );
}
