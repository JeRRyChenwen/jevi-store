// src/app/checkout/_components/PrefetchBraintreeToken.tsx
"use client";

import { useEffect } from "react";
import { prefetchBraintreeToken } from "@/lib/braintreeToken";

// 扩展 window，避免 TS 报错
declare global {
  interface Window {
    __btWarmupDone?: boolean;
    __btWarmupPromise?: Promise<void>;
  }
}

// Braintree/PayPal 可能用到的域名（含 sandbox）
const HINT_HOSTS = [
  // PayPal prod
  "https://www.paypal.com",
  "https://www.paypalobjects.com",
  "https://c.paypal.com",
  // PayPal sandbox（如你在沙箱环境调试时）
  "https://www.sandbox.paypal.com",
  "https://c.sandbox.paypal.com",
  // Braintree
  "https://assets.braintreegateway.com",
  "https://client-analytics.braintreegateway.com",
];

// 你 UI 里用到的 PayPal 图标，提前预加载避免首渲染抖动
const PAYPAL_ICON = "https://www.paypalobjects.com/webstatic/icon/pp258.png";

function ensureHint(
  rel: "preconnect" | "dns-prefetch" | "preload",
  href: string,
  opts?: { crossOrigin?: string; as?: string; fetchPriority?: "high" | "low" }
) {
  if (typeof document === "undefined") return;
  const existed = document.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"][href="${href}"]`
  );
  if (existed) return;

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;

  if (rel === "preconnect" && opts?.crossOrigin) {
    link.crossOrigin = opts.crossOrigin;
  }
  if (rel === "preload" && opts?.as) {
    (link as any).as = opts.as;
  }
  if (opts?.fetchPriority) {
    (link as any).fetchPriority = opts.fetchPriority;
  }
  document.head.appendChild(link);
}

export default function PrefetchBraintreeToken() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 同一标签页内只执行一次；后续挂载直接复用
    if (window.__btWarmupDone) return;
    if (window.__btWarmupPromise) {
      window.__btWarmupDone = true;
      return;
    }

    window.__btWarmupPromise = (async () => {
      // 1) 预热 DNS/TLS
      HINT_HOSTS.forEach((h) => {
        ensureHint("dns-prefetch", h);
        ensureHint("preconnect", h, { crossOrigin: "anonymous" });
      });

      // 2) 预加载你页面里会展示的 PayPal 图标（减少首次闪烁）
      ensureHint("preload", PAYPAL_ICON, { as: "image", fetchPriority: "low" });
      // 也顺手用 Image 预取（某些浏览器对 preload 的缓存策略更保守）
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = PAYPAL_ICON;
      } catch {}

      // 3) 并发：预取 token + 预热 drop-in 包
      //    - token 进 sessionStorage
      //    - 包进浏览器模块缓存
      const tasks: Promise<any>[] = [
        prefetchBraintreeToken().catch(() => {}),
      ];

      // 根据网络情况选择立即或空闲时预热包
      const effectiveType = (navigator as any)?.connection?.effectiveType || "";
      const saveData = (navigator as any)?.connection?.saveData || false;
      const warmDropin = () => import("braintree-web-drop-in").catch(() => {});

      if (!saveData && !/2g/i.test(effectiveType)) {
        // 网络还可以，直接预热
        tasks.push(warmDropin());
      } else {
        // 低网/省流：空闲时再预热，避免争夺首屏资源
        const idle = (cb: () => void) =>
          "requestIdleCallback" in window
            ? (window as any).requestIdleCallback(cb, { timeout: 800 })
            : setTimeout(cb, 0);
        idle(() => warmDropin());
      }

      await Promise.all(tasks);
    })();

    window.__btWarmupPromise.finally(() => {
      window.__btWarmupDone = true;
    });
  }, []);

  return null;
}
