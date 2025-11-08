// src/app/checkout/_components/BraintreePayPalOnly.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  readCachedBraintreeToken,
  prefetchBraintreeToken,
  fetchAndOverwriteBraintreeToken,
} from "@/lib/braintreeToken";

type Props = {
  amount: number;           // 单位: 元（如 1275.00）
  currency: string;         // "AUD"
  onSucceeded?: (r: { id: string }) => void;
  onInitiate?: () => void;
  enabled?: boolean;        // 只在 payment 步骤传 true
};

declare global {
  interface Window { __btTokenPromise?: Promise<string>; }
}

const STORAGE_KEY = "bt:clientToken";
const PAYPAL_NS = "paypalBT";   // 独立命名空间，避免 HMR/多实例冲突
const BTN_HEIGHT = 45;

const PAYPAL_CLIENT_ID =
  (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "").trim() || "sb";

/** 单例拿 braintree clientToken */
async function ensureTokenOnce(): Promise<string> {
  if (typeof window === "undefined") return "";
  const cached =
    readCachedBraintreeToken?.() || sessionStorage.getItem(STORAGE_KEY);
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
    const token =
      typeof res === "string" ? res : (res as any)?.clientToken || "";
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

/** 手动插入 PayPal SDK 脚本（带 client-id & data-client-token & data-namespace） */
function loadPaypalScript({
  clientId,
  token,
  currency,
}: {
  clientId: string;
  token: string;
  currency: string;
}) {
  return new Promise<void>((resolve, reject) => {
    const ns = (window as any)[PAYPAL_NS];
    if (ns?.Buttons) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-namespace="${PAYPAL_NS}"][data-client-token]`
    );
    if (existing && (window as any)[PAYPAL_NS]?.Buttons) return resolve();
    if (existing) existing.remove();

    const params = new URLSearchParams({
      "client-id": clientId,
      components: "buttons",
      currency: currency.toUpperCase(),
      intent: "capture",
      commit: "true",
      "disable-funding": "card,credit,venmo,paylater",
    });

    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-client-token", token);
    s.setAttribute("data-namespace", PAYPAL_NS);

    s.onload = () => {
      const ok = (window as any)[PAYPAL_NS]?.Buttons;
      ok
        ? resolve()
        : reject(new Error("PayPal SDK loaded but namespace missing"));
    };
    s.onerror = () => reject(new Error("Failed to load PayPal SDK"));

    document.head.appendChild(s);
  });
}

export default function BraintreePayPalOnly({
  amount,
  currency,
  onSucceeded,
  onInitiate,
  enabled = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onInitiateRef = useRef(onInitiate);
  const onSucceededRef = useRef(onSucceeded);
  useEffect(() => {
    onInitiateRef.current = onInitiate;
  }, [onInitiate]);
  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  // ✅ 只作为“状态”，不提前 return
  const disabled = !enabled || amount <= 0;

  useEffect(() => {
    // 若禁用，清理并直接退出
    if (disabled) {
      setReady(false);
      setError(null);
      const host = hostRef.current;
      if (host) host.innerHTML = "";
      return;
    }

    let cancelled = false;
    let cleanupButtons: (() => void) | null = null;

    async function boot() {
      try {
        setReady(false);
        setError(null);

        // 1) 取 clientToken
        let token = await ensureTokenOnce();
        if (!token) {
          await fetchAndOverwriteBraintreeToken();
          token = await ensureTokenOnce();
        }
        if (!token) throw new Error("No Braintree clientToken");

        // 2) 注入 PayPal SDK
        await loadPaypalScript({
          clientId: PAYPAL_CLIENT_ID,
          token,
          currency,
        });

        if (cancelled) return;
        const paypal = (window as any)[PAYPAL_NS];
        if (!paypal?.Buttons) throw new Error("PayPal SDK not available");

        // 3) 创建 braintree paypalCheckout 实例
        const braintree = await import("braintree-web");
        const client = await braintree.client.create({ authorization: token });
        const ppCheckout = await braintree.paypalCheckout.create({ client });

        // 4) 渲染 PayPal 按钮
        const host = hostRef.current;
        if (!host) return;
        host.innerHTML = "";

        const buttons = paypal.Buttons({
          fundingSource: paypal.FUNDING.PAYPAL,
          style: {
            layout: "horizontal",
            label: "paypal",
            height: BTN_HEIGHT,
            tagline: false,
            color: "gold",
            shape: "rect",
          },

          onClick: () => {
            try {
              onInitiateRef.current?.();
            } catch {}
            return true;
          },

          createOrder: () =>
            (ppCheckout as any).createPayment({
              flow: "checkout",
              amount: amount.toFixed(2),
              currency: currency.toUpperCase(),
              intent: "capture",
              commit: true,
            }),

          onApprove: async (data: any) => {
            const payload = await (ppCheckout as any).tokenizePayment(data);
            const res = await fetch("/api/braintree/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nonce: payload?.nonce,
                amount,
                currency: currency.toUpperCase(),
              }),
            });
            const out = await res.json().catch(() => ({}));
            if (!res.ok || out?.error || out?.ok === false) {
              throw new Error(
                out?.error || `Payment failed (${res.status})`
              );
            }
            const id = out?.transactionId || out?.id || "";
            onSucceededRef.current?.({ id });
          },

          onError: (err: any) => {
            if (!cancelled)
              setError(err?.message || "PayPal failed to render");
          },
        });

        if (buttons.isEligible && !buttons.isEligible()) {
          setError("PayPal is not eligible on this device/browser.");
          return;
        }

        await buttons.render(host);
        if (cancelled) return;

        cleanupButtons = () => {
          try {
            buttons.close();
          } catch {}
        };
        setReady(true);
      } catch (e: any) {
        if (!cancelled)
          setError(e?.message || "Failed to init PayPal");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      cleanupButtons?.();
    };
  }, [amount, currency, enabled, disabled]);

  // ✅ 所有 hooks 都已经执行完，此时再根据 disabled 决定 UI
  if (disabled) {
    return (
      <div
        className="relative rounded"
        style={{ width: 300, height: BTN_HEIGHT, opacity: 0.6 }}
        aria-disabled="true"
        title="Your total is 0. Add items to proceed with payment."
      >
        <div className="absolute inset-0 rounded border border-neutral-200 bg-neutral-100" />
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{ width: 300, height: BTN_HEIGHT }}
      aria-busy={!ready}
      aria-live="polite"
    >
      <div ref={hostRef} className="absolute inset-0" />
      {error && (
        <div className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {String(error)}
        </div>
      )}
    </div>
  );
}
