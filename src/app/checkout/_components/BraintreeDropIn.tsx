// src/app/checkout/_components/BraintreeDropIn.tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  amount: number;          // 主货币单位金额，如 250.00
  currency: string;        // 'USD' | 'AUD' | 'EUR' | 'GBP' | 'CAD' ...
  enableCard?: boolean;    // 是否在 Drop-in 开卡（默认只开 PayPal）
  onSucceeded?: (r: { id: string }) => void;
};

export default function BraintreeDropIn({
  amount,
  currency,
  enableCard = false,
  onSucceeded,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);          // 互斥：只保留最后一次创建
  const liveInstanceRef = useRef<any>(null);

  const uid = useId();
  const [instance, setInstance] = useState<any>(null);
  const [creating, setCreating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 统一大写，保证和后端映射一致（如 BT_MERCHANT_ACCOUNT_AUD）
  const cur = (currency || "AUD").toUpperCase();

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    // 进入新一轮创建：使之前的创建全部失效
    runIdRef.current += 1;
    const myRun = runIdRef.current;

    // 清空容器，避免“不是空节点”的错误
    try { node.innerHTML = ""; } catch {}

    setError(null);
    setCreating(true);
    setInstance(null);

    let created: any = null;

    (async () => {
      try {
        // 1) 取 clientToken
        const res = await fetch("/api/braintree/token", { cache: "no-store" });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Get clientToken failed (${res.status}). ${txt}`);
        }
        const { clientToken, token } = await res.json();
        const auth = clientToken || token;
        if (!auth) throw new Error("No clientToken returned");

        // 如果在等待 token 期间又来了一轮创建，直接放弃
        if (myRun !== runIdRef.current) return;

        // 2) 动态引入 Drop-in
        const dropin = (await import("braintree-web-drop-in")).default;

        // 3) 创建实例（此时容器必须是空的）
        created = await dropin.create({
          authorization: auth,
          container: node,
          locale: "en", // 可按需要换本地化，如 'en_AU'
          card: enableCard ? { cardholderName: true } : false,
          paypal: {
            flow: "checkout",
            amount: amount.toFixed(2), // PayPal 期望字符串形式金额
            currency: cur,             // ✅ 与后端一致的币种
            commit: true,
          },
          // 如需：paypalCredit: false, venmo: false,
        } as any);

        // 如果这次创建已过期（StrictMode 第二次已开始），立刻销毁自己
        if (myRun !== runIdRef.current) {
          await created.teardown().catch(() => {});
          created = null;
          return;
        }

        liveInstanceRef.current = created;
        setInstance(created);
      } catch (e: any) {
        console.error("[Braintree] init error:", e);
        setError(e?.message || "Failed to initialise Braintree Drop-in");
      } finally {
        if (myRun === runIdRef.current) setCreating(false);
      }
    })();

    // 清理：使当前创建过期，并销毁已存在的实例
    return () => {
      runIdRef.current += 1; // 让本轮创建“过期”
      (async () => {
        try { await created?.teardown(); } catch {}
        try { await liveInstanceRef.current?.teardown(); } catch {}
        liveInstanceRef.current = null;
        try { node.innerHTML = ""; } catch {}
      })();
    };
  }, [amount, cur, enableCard]); // ✅ 用 cur，币种变化时重建

  const handlePay = async () => {
    const inst = instance;
    if (!inst) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = await inst.requestPaymentMethod(); // 弹出 PayPal，拿 nonce
      const res = await fetch("/api/braintree/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce: payload?.nonce,
          amount,          // number，后端会 toFixed(2)
          currency: cur,   // ✅ 与初始化保持一致
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error || data?.ok === false) {
        throw new Error(data?.error || `Payment failed (${res.status})`);
      }
      // 兼容后端返回字段名：transactionId（新）或 id（旧）
      const id = data?.transactionId || data?.id || "";
      onSucceeded?.({ id });
    } catch (e: any) {
      console.error("[Braintree] pay error:", e);
      setError(e?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[680px] space-y-4">
      {/* Drop-in 容器：给最小高度避免被压扁 */}
      <div id={`bt-dropin-${uid}`} ref={containerRef} className="min-h-[56px]" />

      {creating && (
        <div className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          Loading PayPal…
        </div>
      )}
      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={creating || submitting || !instance}
        onClick={handlePay}
        className={[
          "rounded-full px-6 py-3 text-sm font-semibold",
          creating || submitting || !instance
            ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
            : "bg-neutral-900 text-white hover:bg-neutral-800",
        ].join(" ")}
      >
        {creating ? "Initialising…" : submitting ? "Processing…" : enableCard ? "Pay now" : "Pay with PayPal"}
      </button>
    </div>
  );
}
