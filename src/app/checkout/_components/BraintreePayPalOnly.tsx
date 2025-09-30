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
  /** ✅ 新增：用户点击黄色 PayPal 按钮时触发（不管后续是否支付成功） */
  onInitiate?: () => void;
};

export default function BraintreePayPalOnly({ amount, currency, onSucceeded, onInitiate }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let buttons: any = null;

    const boot = async () => {
      setReady(false);
      setError(null);

      const host = hostRef.current;
      if (!host) return;
      host.innerHTML = ""; // 清空旧的

      // 1) 取 clientToken（先读缓存/预取，不行再拉新）
      let auth = readCachedBraintreeToken();
      if (!auth) {
        try { auth = await prefetchBraintreeToken(); } catch {}
      }
      if (!auth) throw new Error("No clientToken");

      // 2) Braintree + PayPal SDK
      const braintree = await import("braintree-web");
      const client = await braintree.client.create({ authorization: auth });
      const ppCheckout = await braintree.paypalCheckout.create({ client });

      // 通过 braintree 自动加载 PayPal SDK（会带 data-client-token），仅加载 buttons 组件
      await (ppCheckout as any).loadPayPalSDK({
        currency: currency.toUpperCase(),
        intent: "capture",
        components: "buttons",
        commit: true,
      });

      if (cancelled) return;

      // 3) 渲染“裸”的 PayPal 按钮
      const paypal = (window as any).paypal;
      buttons = paypal.Buttons({
        fundingSource: paypal.FUNDING.PAYPAL,
        style: { layout: "horizontal", label: "paypal", height: 45, tagline: false }, // ✨ 只要按钮，无 tagline

        /** ✅ 新增：用户点击按钮就回调（不阻塞后续 createOrder） */
        onClick: () => {
          try { onInitiate?.(); } catch {}
          return true; // 允许继续
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
          const payload = await (ppCheckout as any).tokenizePayment(data); // 得到 nonce
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

      await buttons.render(host);
      if (!cancelled) setReady(true);
    };

    boot().catch(async (e) => {
      // 第一次失败（比如 token 过期）→ 换新 token 再试一次
      try {
        await fetchAndOverwriteBraintreeToken();
        await boot();
      } catch (err) {
        if (!cancelled) setError((err as any)?.message || (e as any)?.message || "Failed to init PayPal");
      }
    });

    return () => {
      cancelled = true;
      try { buttons?.close?.(); } catch {}
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [amount, currency, onInitiate, onSucceeded]);

  return (
    <div className="relative min-h-[72px]">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-11 w-[210px] rounded-md bg-neutral-100 shadow-inner" />
        </div>
      )}
      {/* 只渲染按钮，不带任何外框 */}
      <div ref={hostRef} className={ready ? "" : "opacity-0"} />
      {error && (
        <div className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
      )}
    </div>
  );
}
