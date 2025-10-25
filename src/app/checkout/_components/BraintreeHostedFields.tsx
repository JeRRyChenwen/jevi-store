// src/app/checkout/_components/BraintreeHostedFields.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  readCachedBraintreeToken,
  prefetchBraintreeToken,
  fetchAndOverwriteBraintreeToken,
} from "@/lib/braintreeToken";

type Props = {
  amount: number;
  currency: string;
  onSucceeded?: (r: { id: string }) => void;
  onInitiate?: () => void;
};

declare global {
  interface Window {
    __btTokenPromise?: Promise<string>;
  }
}

const STORAGE_KEY = "bt:clientToken";

// 与 PayPal 组件一致：只在前端会话内取一次 token（并缓存）
async function ensureTokenOnce(): Promise<string> {
  if (typeof window === "undefined") return "";
  const cached = readCachedBraintreeToken?.() || sessionStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  if (window.__btTokenPromise) {
    try {
      const t = await window.__btTokenPromise;
      if (t) sessionStorage.setItem(STORAGE_KEY, t);
      return t || "";
    } catch {
      delete window.__btTokenPromise;
      return "";
    }
  }

  window.__btTokenPromise = (async () => {
    const res = await prefetchBraintreeToken();
    const token = typeof res === "string" ? res : (res as any)?.clientToken || "";
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    return token;
  })();

  try {
    return await window.__btTokenPromise;
  } catch {
    delete window.__btTokenPromise;
    return "";
  }
}

export default function BraintreeHostedFields({
  amount,
  currency,
  onSucceeded,
  onInitiate,
}: Props) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hfRef = useRef<any>(null);
  const onSucceededRef = useRef<typeof onSucceeded>();
  const onInitiateRef = useRef<typeof onInitiate>();
  onSucceededRef.current = onSucceeded;
  onInitiateRef.current = onInitiate;

  // mount hosted fields
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      setError(null);
      setReady(false);

      // 1) client token
      let auth = await ensureTokenOnce();
      if (!auth) {
        try {
          await fetchAndOverwriteBraintreeToken();
          auth = await ensureTokenOnce();
        } catch {}
      }
      if (!auth) throw new Error("Failed to get clientToken");

      // 2) braintree client + hosted fields
      const braintree = await import("braintree-web");
      const client = await braintree.client.create({ authorization: auth });

      const hf = await braintree.hostedFields.create({
        client,
        styles: {
          input: {
            "font-size": "14px",
            "line-height": "20px",
            "font-family": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            color: "#111827",
          },
          ":focus": { color: "#111827" },
          ".invalid": { color: "#EF4444" },
          ".valid": { color: "#10B981" },
          "::-ms-clear": { display: "none" },
        },
        fields: {
          number:        { selector: "#bf-card-number", placeholder: "4111 1111 1111 1111" },
          expirationDate:{ selector: "#bf-expiration-date", placeholder: "MM/YY" },
          cvv:           { selector: "#bf-cvv", placeholder: "CVC" },
          postalCode:    { selector: "#bf-postal-code", placeholder: "Postcode" },
        },
      });

      if (cancelled) {
        try { hf.teardown(); } catch {}
        return;
      }

      hfRef.current = hf;
      setReady(true);
    };

    boot().catch((e) => setError((e as any)?.message || "Failed to init card fields"));

    return () => {
      cancelled = true;
      const hf = hfRef.current;
      hfRef.current = null;
      try { hf?.teardown?.(); } catch {}
    };
  }, [amount, currency]);

  const onPay = async () => {
    if (!hfRef.current || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      onInitiateRef.current?.();

      // 1) tokenize（取 nonce）
      const { nonce, details } = await hfRef.current.tokenize({ /* cardholderName 可在此传入 */ });

      // 2) 调你现有的结算 API（与 PayPal 一样）
      const res = await fetch("/api/braintree/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nonce,
          amount,
          currency: currency.toUpperCase(),
          // 也可以带点 meta 给后端存 raw：
          meta: { method: "hosted_fields", cardType: details?.cardType || null },
        }),
        // 不要带 credentials，这个 API 通常不需要 cookie；若你之前故意带可保留
        // credentials: "include",
        keepalive: true,
      });

      const out = await res.json().catch(() => ({} as any));
      if (!res.ok || out?.error || out?.ok === false) {
        throw new Error(out?.error || `Payment failed (${res.status})`);
      }

      const id = out?.transactionId || out?.id || "";
      onSucceededRef.current?.({ id });
    } catch (e: any) {
      setError(e?.message || "Card payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-900">Pay with debit or credit card</div>

      {/* Hosted Fields 容器（Braintree 会把 iframe 嵌入到这些 div 里） */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Card number</label>
            <div id="bf-card-number" className="h-10 rounded-md border border-gray-300 px-3 flex items-center bg-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Expiry</label>
            <div id="bf-expiration-date" className="h-10 rounded-md border border-gray-300 px-3 flex items-center bg-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">CVC</label>
            <div id="bf-cvv" className="h-10 rounded-md border border-gray-300 px-3 flex items-center bg-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Postcode</label>
            <div id="bf-postal-code" className="h-10 rounded-md border border-gray-300 px-3 flex items-center bg-white" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onPay}
        disabled={!ready || submitting}
        className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 text-white disabled:opacity-60"
        aria-busy={submitting}
      >
        {submitting ? "Processing..." : `Pay ${currency.toUpperCase()} ${amount.toFixed(2)}`}
      </button>

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      )}
    </div>
  );
}
