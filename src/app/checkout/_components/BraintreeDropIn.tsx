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
  const hostRef = useRef<HTMLDivElement>(null); // 仅作为“托盘”，真正挂载点每次创建
  const runIdRef = useRef(0);
  const liveInstanceRef = useRef<any>(null);

  const uid = useId();
  const shellId = `bt-shell-${uid.replace(/:/g, "")}`;

  const [instance, setInstance] = useState<any>(null);
  const [creating, setCreating] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canPay, setCanPay] = useState(false);

  const cur = (currency || "AUD").toUpperCase();

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

  /** 追加到 <head> 的“净化皮肤”，用组件唯一 shellId 限定作用域 */
  const injectSkin = () => {
    const id = `${shellId}-skin`;
    let el = document.getElementById(id) as HTMLStyleElement | null;
    const css = `
      /* 只影响当前组件容器里的 Drop-in */
      #${shellId} .braintree-dropin,
      #${shellId} .braintree-dropin * {
        box-shadow: none !important;
      }
      /* 去除外层背景/边框/内外边距 */
      #${shellId} .braintree-dropin,
      #${shellId} .braintree-dropin .braintree-sheet,
      #${shellId} .braintree-dropin .braintree-sheet__content,
      #${shellId} .braintree-dropin .braintree-options,
      #${shellId} .braintree-dropin .braintree-option,
      #${shellId} .braintree-dropin .braintree-option__content,
      #${shellId} .braintree-dropin .braintree-option__content--paypal,
      #${shellId} .braintree-dropin .braintree-methods,
      #${shellId} .braintree-dropin .braintree-method {
        background: transparent !important;
        border: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      /* 干掉用伪元素画的上下分隔线 */
      #${shellId} .braintree-dropin .braintree-option--paypal::before,
      #${shellId} .braintree-dropin .braintree-option--paypal::after,
      #${shellId} .braintree-dropin .braintree-option__content--paypal::before,
      #${shellId} .braintree-dropin .braintree-option__content--paypal::after {
        content: none !important;
        display: none !important;
        border: 0 !important;
      }
      /* 隐藏左侧 PayPal 文本/图标列及任何标题 */
      #${shellId} .braintree-dropin .braintree-option__label,
      #${shellId} .braintree-dropin .braintree-heading,
      #${shellId} .braintree-dropin .braintree-toggle {
        display: none !important;
      }
      /* 让按钮容器居中显示（容器本身无边框背景） */
      #${shellId} .braintree-dropin .braintree-option__paypal-button,
      #${shellId} .braintree-dropin [class*="paypal-button"] {
        display: block !important;
        margin: 0 auto !important;
      }
    `;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      el.type = "text/css";
      el.appendChild(document.createTextNode(css));
      document.head.appendChild(el);
    } else {
      el.textContent = css;
      // 把样式节点移动到 head 的最后，确保优先级最高
      document.head.appendChild(el);
    }
  };

  /** 每次给 Drop-in 一个全新空 mount 节点 */
  const createMount = () => {
    const host = hostRef.current!;
    const old = host.querySelector('[data-bt-root="1"]');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    const mount = document.createElement("div");
    mount.setAttribute("data-bt-root", "1");
    mount.style.minHeight = "52px";
    mount.style.width = "100%";
    host.appendChild(mount);
    return mount;
  };

  const waitForMeasured = async (el: HTMLElement) => {
    const deadline = Date.now() + 500;
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

    try { host.innerHTML = ""; } catch {}

    setError(null);
    setCreating(true);
    setReady(false);
    setInstance(null);
    setCanPay(false);
    onCanPayChange?.(false);

    (async () => {
      let created: any = null;
      try {
        // 1) 先拿 token（缓存→预取）
        let auth = readCachedBraintreeToken();
        if (!auth) {
          try { auth = await prefetchBraintreeToken(); } catch {}
        }
        if (!auth) throw new Error("No cached clientToken");
        if (myRun !== runIdRef.current) return;

        // 2) 动态引入 drop-in
        const dropin = (await import("braintree-web-drop-in")).default;

        // 3) 创建（确保 mount 有尺寸）
        const createWith = async (authToken: string) => {
          const mount = createMount();
          await waitForMeasured(mount);
          const inst = await dropin.create({
            authorization: authToken,
            container: mount,
            locale: "en",
            paymentOptionPriority: ["paypal"], // 只留 PayPal
            card: enableCard ? { cardholderName: true } : false,
            paypal: {
              flow: "checkout",
              amount: amount.toFixed(2),
              currency: cur,
              commit: true,
              buttonStyle: { layout: "horizontal", label: "paypal", height: 45, tagline: false },
            },
          } as any);

          // ★ 创建完成后再注入样式，保证覆盖它后来插入的样式
          injectSkin();
          // 再兜底两次把样式移动到 head 最后，避免 HMR/懒加载又插入样式把我们“压下去”
          setTimeout(injectSkin, 0);
          setTimeout(injectSkin, 250);
          return inst;
        };

        try {
          created = await createWith(auth);
        } catch (err: any) {
          const msg = String(err?.message || "").toLowerCase();
          const isAllFailed = err?.name === "DropinError" && msg.includes("all payment options failed to load");
          if (isAllFailed) {
            await delay(150);
            if (myRun !== runIdRef.current) return;
            try {
              created = await createWith(auth);
            } catch {
              const fresh = await fetchAndOverwriteBraintreeToken();
              if (myRun !== runIdRef.current) return;
              created = await createWith(fresh);
            }
          } else {
            const fresh = await fetchAndOverwriteBraintreeToken();
            if (myRun !== runIdRef.current) return;
            created = await createWith(fresh);
          }
        }

        if (myRun !== runIdRef.current) {
          await created?.teardown?.().catch(() => {});
          return;
        }

        created.on?.("paymentMethodRequestable", () => {
          setCanPay(true);
          onCanPayChange?.(true);
        });
        created.on?.("noPaymentMethodRequestable", () => {
          setCanPay(false);
          onCanPayChange?.(false);
        });

        onExposePay?.(() => handlePay(created));
        liveInstanceRef.current = created;
        setInstance(created);
        setTimeout(() => setReady(true), 20);
      } catch (e: any) {
        console.error("[Braintree] init error:", e);
        setError(e?.message || "Failed to initialise Braintree Drop-in");
      } finally {
        if (myRun === runIdRef.current) setCreating(false);
      }
    })();

    return () => {
      runIdRef.current += 1;
      (async () => {
        try { await liveInstanceRef.current?.teardown(); } catch {}
        liveInstanceRef.current = null;
        try { host.innerHTML = ""; } catch {}
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
      const payload = await inst.requestPaymentMethod();
      const res = await fetch("/api/braintree/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nonce: payload?.nonce, amount, currency: cur }),
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
      {/* 外层 Shell：给最小高度、控制淡入 */}
      <div id={shellId} className="relative min-h-[72px]" aria-busy={creating && !ready}>
        {/* 骨架（ready 前显示） */}
        <div
          className={[
            "absolute inset-0 z-0 flex items-center justify-center rounded-lg bg-white",
            ready ? "hidden" : "",
          ].join(" ")}
          aria-hidden={!creating || ready}
        >
          <div className="h-11 w-[210px] rounded-md bg-neutral-100 shadow-inner" />
        </div>
        {/* 真正的挂载托盘（Drop-in 实际挂载在其子节点） */}
        <div
          ref={hostRef}
          className={[
            "relative z-10 transition-opacity duration-200 ease-out",
            ready ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      </div>

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
