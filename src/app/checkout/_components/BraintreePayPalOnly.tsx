// src/app/checkout/_components/BraintreePayPalOnly.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  readCachedBraintreeToken,
  prefetchBraintreeToken,
  fetchAndOverwriteBraintreeToken,
} from "@/lib/braintreeToken";

type Props = {
  amount: number;                 // 主货币单位金额，如 13.80
  currency: string;               // 'AUD' | 'USD' ...
  onSucceeded?: (r: { id: string }) => void;
  /** 用户点击黄色 PayPal 按钮时触发（不管后续是否支付成功） */
  onInitiate?: () => void;
};

declare global {
  interface Window {
    __btTokenPromise?: Promise<string>;
    paypal?: any;
  }
}

const STORAGE_KEY = "bt:clientToken";

// —— 单航班：同一标签页里只真正请求一次 token ——
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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let buttons: any = null;

    const boot = async () => {
      setError(null);
      setReady(false);

      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = ""; // 清空旧渲染

      // 1) 取 clientToken（单航班 + 缓存）
      let auth = await ensureTokenOnce();
      if (!auth) {
        try {
          await fetchAndOverwriteBraintreeToken();
          auth = await ensureTokenOnce();
        } catch {}
      }
      if (!auth) throw new Error("No clientToken");

      // 2) Braintree + PayPal SDK（不重复加载 SDK）
      const braintree = await import("braintree-web");
      const client = await braintree.client.create({ authorization: auth });
      const ppCheckout = await braintree.paypalCheckout.create({ client });

      if (typeof window === "undefined" || !window.paypal) {
        await (ppCheckout as any).loadPayPalSDK({
          currency: currency.toUpperCase(),
          intent: "capture",
          components: "buttons",
          commit: true,
        });
      }
      if (cancelled) return;

      // 3) 渲染“真” PayPal 按钮
      const paypal = (window as any).paypal;
      if (!paypal?.Buttons) throw new Error("PayPal SDK not available");

      buttons = paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL,
        style: {
          layout: "horizontal",
          label: "paypal",
          height: 45,
          tagline: false,
          color: "gold",
          shape: "rect",
        },

        // 点击即回调（不阻塞后续 createOrder）
        onClick: () => {
          try { onInitiate?.(); } catch {}
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
          onSucceeded?.({ id });
        },

        onError: (err: any) => {
          if (!cancelled) setError(err?.message || "PayPal failed to render");
        },
      });

      if (buttons.isEligible && !buttons.isEligible()) {
        setError("PayPal is not eligible on this device/browser.");
        return;
      }

      await buttons.render(host);     // 真实按钮完成首次绘制
      if (!cancelled) setReady(true); // 仅用于错误提示/诊断；不再控制 UI 占位
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
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [amount, currency, onInitiate, onSucceeded]);

  return (
    // 只保留真实 PayPal 容器，固定尺寸，避免任何视觉不一致
    <div className="relative" style={{ width: 300, height: 45 }}>
      <div ref={hostRef} className="absolute inset-0" aria-live="polite" />
      {error && (
        <div className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
      )}
    </div>
  );
}
