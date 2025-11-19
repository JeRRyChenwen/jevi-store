// src/app/checkout/_components/BraintreeDropIn.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  readCachedBraintreeToken,
  prefetchBraintreeToken,
  fetchAndOverwriteBraintreeToken,
} from "@/lib/braintreeToken";

type Props = {
  amount: number; // 单位: 元（如 1275.00）
  currency: string; // "AUD"
  enableCard?: boolean;
  hideSubmitButton?: boolean;
  onExposePay?: (fn: () => void) => void;
  onCanPayChange?: (can: boolean) => void;
  onSucceeded?: (payload: any) => void;
};

declare global {
  interface Window {
    __btTokenPromise?: Promise<string>;
  }
}

const STORAGE_KEY = "bt:clientToken";

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

export default function BraintreeDropIn({
  amount,
  currency,
  enableCard = true,
  hideSubmitButton = true,
  onExposePay,
  onCanPayChange,
  onSucceeded,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dropinRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);

  const onSucceededRef = useRef(onSucceeded);
  const onCanPayChangeRef = useRef(onCanPayChange);

  useEffect(() => {
    onSucceededRef.current = onSucceeded;
  }, [onSucceeded]);

  useEffect(() => {
    onCanPayChangeRef.current = onCanPayChange;
  }, [onCanPayChange]);

  /* ========== 暴露 pay() 给外层（PaymentStep） ========== */
  useEffect(() => {
    if (!onExposePay) return;

    const pay = async () => {
      const instance = dropinRef.current;
      if (!instance) {
        console.warn("[BraintreeDropIn] pay() called but no instance");
        return;
      }

      try {
        console.log("[BraintreeDropIn] requestPaymentMethod…");
        const payload = await instance.requestPaymentMethod();
        console.log(
          "[BraintreeDropIn] requestPaymentMethod payload:",
          payload
        );

        const res = await fetch("/api/braintree/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nonce: payload.nonce,
            amount,
            currency: currency.toUpperCase(),
          }),
        });

        const data = await res.json().catch(() => ({}));
        console.log(
          "[BraintreeDropIn] /api/braintree/checkout result:",
          res.status,
          data
        );

        if (!res.ok || data?.error || data?.ok === false) {
          throw new Error(data?.error || `Payment failed (${res.status})`);
        }

        // 把后端返回的数据直接往外传，PaymentStep 再加工
        onSucceededRef.current?.(data);
      } catch (e: any) {
        console.error("[BraintreeDropIn] pay() error:", e);
        alert(e?.message || "Payment failed");
      }
    };

    console.log("[BraintreeDropIn] onExposePay called, set pay fn");
    onExposePay(pay);
  }, [amount, currency, onExposePay]);

  /* ========== 初始化 Drop-in ========== */
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setError(null);

        if (amount <= 0) {
          console.log(
            "[BraintreeDropIn] amount <= 0, skip init. amount=",
            amount
          );
          onCanPayChangeRef.current?.(false);
          return;
        }

        const host = hostRef.current;
        if (!host) {
          console.warn("[BraintreeDropIn] hostRef is null at boot()");
          onCanPayChangeRef.current?.(false);
          return;
        }

        // 强制清空容器，确保是 EMPTY DOM NODE
        host.innerHTML = "";
        console.log(
          "[BraintreeDropIn] boot, host childNodes after clear:",
          host.childNodes.length
        );

        let token = await ensureTokenOnce();
        if (!token) {
          await fetchAndOverwriteBraintreeToken();
          token = await ensureTokenOnce();
        }
        if (!token) throw new Error("No Braintree clientToken");

        const dropinModule = await import("braintree-web-drop-in");
        const dropin = (dropinModule as any).default || dropinModule;

        console.log("[BraintreeDropIn] creating drop-in…");
        const instance = await dropin.create({
          authorization: token,
          container: host, // ⚠️ 一定要是空的 DOM 节点
          card: enableCard
            ? {
                cardholderName: { required: false },
              }
            : false,
          paypal: {
            flow: "checkout",
            amount: amount.toFixed(2),
            currency: currency.toUpperCase(),
          },
          paypalCredit: false,
          vaultManager: false,
        });

        if (cancelled) {
          try {
            await instance.teardown();
          } catch {}
          return;
        }

        dropinRef.current = instance;
        console.log("[BraintreeDropIn] init ok");
        onCanPayChangeRef.current?.(true);
      } catch (e: any) {
        // 针对 StrictMode / 容器重复使用的特殊报错做一个宽容处理
        const msg = String(e?.message || "");
        if (
          e?.name === "DropinError" &&
          msg.includes("must reference an empty DOM node")
        ) {
          console.warn(
            "[BraintreeDropIn] DropinError (container not empty), but will keep previous instance if any"
          );
          // 如果之前已经有实例，就认为仍然可以支付
          if (dropinRef.current) {
            onCanPayChangeRef.current?.(true);
            return;
          }
        }

        console.error("[BraintreeDropIn] init error:", e);
        if (!cancelled) {
          setError(msg || "Failed to init Braintree");
          onCanPayChangeRef.current?.(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      const inst = dropinRef.current;
      if (inst && inst.teardown) {
        inst
          .teardown()
          .catch(() => {})
          .finally(() => {
            dropinRef.current = null;
            // 只在真正卸载时才关掉 canPay
            onCanPayChangeRef.current?.(false);
          });
      } else {
        dropinRef.current = null;
        onCanPayChangeRef.current?.(false);
      }
    };
    // 这里故意只依赖 enableCard，
    // amount / currency 变化时通常会重新进 Payment 步骤，组件会重挂载
  }, [enableCard, amount, currency]);

  return (
    <div>
      {/* ⚠️ 这个 div 一定保持完全空，所有东西都由 Braintree 接管 */}
      <div ref={hostRef} />

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {String(error)}
        </p>
      )}

      {!hideSubmitButton && (
        <p className="mt-2 text-xs text-neutral-500">
          Use the button inside the payment box to complete the payment.
        </p>
      )}
    </div>
  );
}
