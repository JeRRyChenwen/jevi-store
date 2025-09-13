// src/app/checkout/_components/StripePayment.tsx
"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

/** 允许在 props 中传 cart / delivery 作为 metadata（可选） */
export type DeliveryMethod = "standard" | "express";
export type MinimalCartItem = {
  key: string;
  title: string;
  price: number;
  qty: number;
  currency: string;
};

type StripePaymentProps = {
  /** 金额（最小货币单位，例如 USD 的 cents） */
  amountInCents: number;
  /** 货币代码（如 'USD'） */
  currency: string;
  /** 可选：下单商品，传给后端用于 metadata（后端也可忽略） */
  cart?: MinimalCartItem[];
  /** 可选：配送方式，传给后端用于 metadata（后端也可忽略） */
  delivery?: DeliveryMethod;
  /** 可选：在当前页直接支付成功时回调（无需跳转） */
  onSucceeded?: (paymentIntentId?: string) => void;
};

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);

function CheckoutForm({
  onSucceeded,
}: {
  onSucceeded?: (paymentIntentId?: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMsg(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      // 如果需要 3DS，会自动处理；能在本页完成就不跳转
      redirect: "if_required",
      confirmParams: {
        // 若走到重定向流程，回到确认页
        return_url: `${window.location.origin}/checkout/confirm`,
      },
    });

    if (error) {
      setErrorMsg(error.message || "Payment failed");
      setLoading(false);
      return;
    }

    // 在本页即可拿到成功态
    if (paymentIntent?.status === "succeeded") {
      onSucceeded?.(paymentIntent.id);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-[520px] space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {errorMsg && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {errorMsg}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className={[
          "rounded-full px-6 py-3 text-sm font-semibold",
          !stripe || !elements || loading
            ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
      >
        {loading ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}

export default function StripePayment({
  amountInCents,
  currency,
  cart,
  delivery,
  onSucceeded,
}: StripePaymentProps) {
  const [clientSecret, setClientSecret] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 金额非法则不创建意图
    if (!amountInCents || amountInCents <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    setError(null);

    const create = async () => {
      try {
        const res = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // 后端如果只读 amount/currency，额外字段会被忽略；若已实现，可用于 metadata
          body: JSON.stringify({
            amount: amountInCents,
            currency,
            cart,
            delivery,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "Failed to create PaymentIntent");
        }
        const data = await res.json();
        if (!data?.clientSecret) {
          throw new Error("No clientSecret in response");
        }
        setClientSecret(data.clientSecret);
      } catch (e: any) {
        setError(e?.message || "Failed to prepare payment");
      }
    };

    create();
  }, [amountInCents, currency, delivery, cart]);

  if (!pk) {
    return (
      <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
        Missing <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>. Please set it in
        your environment.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (!clientSecret) {
    return <div className="text-sm text-neutral-500">Preparing payment…</div>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <CheckoutForm onSucceeded={onSucceeded} />
    </Elements>
  );
}
