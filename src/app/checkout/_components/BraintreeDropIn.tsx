// src/app/checkout/_components/BraintreeDropIn.tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  readCachedBraintreeToken,
  prefetchBraintreeToken,
  fetchAndOverwriteBraintreeToken,
} from "@/lib/braintreeToken";

type Props = {
  amount: number;
  currency: string;
  enableCard?: boolean;
  onSucceeded?: (r: { id: string }) => void;
  hideSubmitButton?: boolean;
  onExposePay?: (pay: () => void) => void;
  onCanPayChange?: (can: boolean) => void;
};

export default function BraintreeDropIn({
  amount,
  currency,
  enableCard = false,
  onSucceeded,
  hideSubmitButton,
  onExposePay,
  onCanPayChange,
}: Props) {
  // 仅作“托盘”，不会把这个节点直接给 Braintree
  const hostRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);
  const liveInstanceRef = useRef<any>(null);

  const uid = useId();
  const [instance, setInstance] = useState<any>(null);
  const [creating, setCreating] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canPay, setCanPay] = useState(false);

  const cur = (currency || "AUD").toUpperCase();

  // 小工具
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () =>
    new Promise<void>((r) => requestAnimationFrame(() => r()));

  // 确保托盘里存在一个“全新的、空的挂载节点”
  const createMount = () => {
    const host = hostRef.current!;
    // 移除旧的
    const old = host.querySelector('[data-bt-root="1"]');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    // 新建
    const mount = document.createElement("div");
    mount.setAttribute("data-bt-root", "1");
    // 给点最小尺寸，避免 0 宽高导致 PayPal 按钮初始化失败
    mount.style.minHeight = "52px";
    mount.style.width = "100%";
    host.appendChild(mount);
    return mount;
  };

  // 等到挂载节点具有非零尺寸（最多 500ms）
  const waitForMeasured = async (el: HTMLElement) => {
    const deadline = Date.now() + 500;
    // 先让浏览器排版至少 1 帧
    await nextFrame();
    while (Date.now() < deadline) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return;
      await delay(40);
    }
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    runIdRef.current += 1;
    const myRun = runIdRef.current;

    // 清空托盘
    try {
      host.innerHTML = "";
    } catch {}

    setError(null);
    setCreating(true);
    setReady(false);
    setInstance(null);
    setCanPay(false);
    onCanPayChange?.(false);

    (async () => {
      let created: any = null;
      try {
        // 1) 读缓存/预取
        let auth = readCachedBraintreeToken();
        if (!auth) {
          try {
            auth = await prefetchBraintreeToken();
          } catch {
            /* 忽略，后面会报错 */
          }
        }
        if (!auth) throw new Error("No cached clientToken");

        if (myRun !== runIdRef.current) return;

        // 2) 动态引入
        const dropin = (await import("braintree-web-drop-in")).default;

        // 3) 包装 create：每次都用“全新的空 mount”，并等待 mount 完成测量
        const createWith = async (authToken: string) => {
          const mount = createMount();
          await waitForMeasured(mount); // ⭐ 关键：等有尺寸再创建
          return await dropin.create({
            authorization: authToken,
            container: mount,
            locale: "en",
            card: enableCard ? { cardholderName: true } : false,
            paypal: {
              flow: "checkout",
              amount: amount.toFixed(2),
              currency: cur,
              commit: true,
              // 可以按需加样式：buttonStyle: { color: "black", shape: "pill", label: "pay", height: 48, layout: "horizontal", tagline: false },
            },
          } as any);
        };

        // --- 第一次尝试 ---
        try {
          created = await createWith(auth);
        } catch (err: any) {
          const msg = String(err?.message || "").toLowerCase();
          const isAllFailed =
            err?.name === "DropinError" &&
            msg.includes("all payment options failed to load");

          if (isAllFailed) {
            // 很多时候只是创建太早：等 150ms，用同一个 token 再来一次
            await delay(150);
            if (myRun !== runIdRef.current) return;
            try {
              created = await createWith(auth);
            } catch (err2: any) {
              // 仍然失败：再拉新 token 重试一次
              const fresh = await fetchAndOverwriteBraintreeToken();
              if (myRun !== runIdRef.current) return;
              created = await createWith(fresh);
            }
          } else {
            // 非“ALL payment options failed…”的错误，直接走拉新 token 再试
            const fresh = await fetchAndOverwriteBraintreeToken();
            if (myRun !== runIdRef.current) return;
            created = await createWith(fresh);
          }
        }

        if (myRun !== runIdRef.current) {
          await created?.teardown?.().catch(() => {});
          return;
        }

        // 事件：授权状态
        created.on?.("paymentMethodRequestable", () => {
          setCanPay(true);
          onCanPayChange?.(true);
        });
        created.on?.("noPaymentMethodRequestable", () => {
          setCanPay(false);
          onCanPayChange?.(false);
        });

        // 暴露“发起支付”供外部按钮调用
        onExposePay?.(() => handlePay(created));

        liveInstanceRef.current = created;
        setInstance(created);

        // 就绪后淡入
        setTimeout(() => setReady(true), 20);
      } catch (e: any) {
        // 只有在最终失败才记日志/显示错误；中间的首轮失败不再刷控制台
        console.error("[Braintree] init error:", e);
        setError(e?.message || "Failed to initialise Braintree Drop-in");
      } finally {
        if (myRun === runIdRef.current) setCreating(false);
      }
    })();

    // 清理
    return () => {
      runIdRef.current += 1;
      (async () => {
        try {
          await liveInstanceRef.current?.teardown();
        } catch {}
        liveInstanceRef.current = null;
        try {
          host.innerHTML = "";
        } catch {}
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, cur, enableCard]);

  const handlePay = async (instParam?: any) => {
    const inst = instParam || instance;
    if (!inst) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = await inst.requestPaymentMethod(); // 拉起 PayPal
      const res = await fetch("/api/braintree/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce: payload?.nonce,
          amount,
          currency: cur,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error || data?.ok === false) {
        throw new Error(data?.error || `Payment failed (${res.status})`);
      }
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
      {/* Shell：固定高度 + 骨架；真实 Drop-in 就绪后淡入 */}
      <div id={`bt-shell-${uid}`} className="relative min-h-[92px]" aria-busy={creating && !ready}>
        {/* 骨架占位（ready 前显示） */}
        <div
          className={[
            "absolute inset-0 z-0 flex items-center justify-center rounded-lg border border-neutral-200 bg-white",
            ready ? "hidden" : "",
          ].join(" ")}
          aria-hidden={!creating || ready}
        >
          <div className="h-12 w-[220px] rounded-full bg-neutral-100 shadow-inner" />
        </div>

        {/* 真实 Drop-in 的“托盘”。真正给 Braintree 的是我们每次新建的子节点 */}
        <div
          ref={hostRef}
          className={[
            "relative z-10 transition-opacity duration-200 ease-out",
            ready ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      </div>

      {/* 只在报错时出现；正常加载不显示文案 */}
      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      )}

      {!hideSubmitButton && (
        <button
          type="button"
          disabled={creating || submitting || !instance || !canPay}
          onClick={() => handlePay()}
          className={[
            "rounded-full px-6 py-3 text-sm font-semibold",
            (creating || submitting || !instance || !canPay)
              ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
              : "bg-neutral-900 text-white hover:bg-neutral-800",
          ].join(" ")}
        >
          {submitting ? "Processing…" : enableCard ? "Pay now" : "Pay with PayPal"}
        </button>
      )}
    </div>
  );
}
