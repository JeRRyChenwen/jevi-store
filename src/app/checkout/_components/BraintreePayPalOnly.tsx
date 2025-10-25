// src/app/checkout/_components/BraintreePayPalOnly.tsx
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
    // 不再声明 window.paypal，避免与 @paypal/paypal-js 的全局类型冲突
  }
}

const STORAGE_KEY = "bt:clientToken";

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

export default function BraintreePayPalOnly({ amount, currency, onSucceeded, onInitiate }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<any>(null);
  const pendingClickRef = useRef(false);

  // 给 useRef 提供初始值
  const onInitiateRef = useRef<Props["onInitiate"]>(undefined);
  const onSucceededRef = useRef<Props["onSucceeded"]>(undefined);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { onInitiateRef.current = onInitiate; }, [onInitiate]);
  useEffect(() => { onSucceededRef.current = onSucceeded; }, [onSucceeded]);

  const tryTriggerClick = async () => {
    try {
      const btn = buttonsRef.current;
      if (btn?.click) await btn.click();
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    let buttons: any = null;

    const boot = async () => {
      setError(null);
      setReady(false);

      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = "";

      // 1) token
      let auth = await ensureTokenOnce();
      if (!auth) {
        try {
          await fetchAndOverwriteBraintreeToken();
          auth = await ensureTokenOnce();
        } catch {}
      }
      if (!auth) throw new Error("No clientToken");

      // 2) Braintree + PayPal SDK（缺少 Buttons 时再加载 SDK）
      const braintree = await import("braintree-web");
      const client = await braintree.client.create({ authorization: auth });
      const ppCheckout = await braintree.paypalCheckout.create({ client });

      if (typeof window === "undefined" || !(window as any).paypal || !(window as any).paypal.Buttons) {
        await (ppCheckout as any).loadPayPalSDK({
          currency: currency.toUpperCase(),
          intent: "capture",
          components: "buttons",
          commit: true,
          // ✅ 关键：禁用 PayPal 自带的卡/信用卡/Pay Later/Venmo 入口，避免和你自建卡表单重复
          "disable-funding": "card,credit,venmo,paylater",
        });
      }
      if (cancelled) return;

      // 3) 渲染 PayPal 按钮（仅 PayPal 资金来源）
      const paypal = (window as any).paypal;
      if (!paypal?.Buttons) throw new Error("PayPal SDK not available");

      buttons = paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL, // 再次限制只显示 PayPal
        style: {
          layout: "horizontal",
          label: "paypal",
          height: 45,
          tagline: false,
          color: "gold",
          shape: "rect",
        },
        onClick: () => {
          try { onInitiateRef.current?.(); } catch {}
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
            throw new Error(out?.error || `Payment failed (${res.status})`);
          }
          const id = out?.transactionId || out?.id || "";
          onSucceededRef.current?.({ id });
        },
        onError: (err: any) => {
          if (!cancelled) setError(err?.message || "PayPal failed to render");
        },
      });

      if (buttons.isEligible && !buttons.isEligible()) {
        setError("PayPal is not eligible on this device/browser.");
        return;
      }

      await buttons.render(host);
      if (cancelled) return;

      buttonsRef.current = buttons;
      setReady(true);

      if (pendingClickRef.current) {
        pendingClickRef.current = false;
        requestAnimationFrame(() => { void tryTriggerClick(); });
      }
    };

    boot().catch(async (e) => {
      try {
        await fetchAndOverwriteBraintreeToken();
        await boot();
      } catch (err) {
        if (!cancelled)
          setError((err as any)?.message || (e as any)?.message || "Failed to init PayPal");
      }
    });

    return () => {
      cancelled = true;
      try { buttons?.close?.(); } catch {}
      buttonsRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [amount, currency]);

  return (
    <div className="relative" style={{ width: 300, height: 45 }} aria-busy={!ready} aria-live="polite">
      <div ref={hostRef} className="absolute inset-0" />
      {!ready && (
        <button
          type="button"
          className="absolute inset-0 z-10"
          aria-label="Pay with PayPal"
          onClick={() => {
            pendingClickRef.current = true;
            void tryTriggerClick();
          }}
          style={{ background: "transparent", cursor: "pointer" }}
        />
      )}
      {error && (
        <div className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      )}
    </div>
  );
}
