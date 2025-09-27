// src/app/checkout/_components/PrefetchBraintreeToken.tsx
"use client";

import { useEffect } from "react";
import { prefetchBraintreeToken } from "@/lib/braintreeToken";

// 给 TS 一个可扩展的 window 字段
declare global {
  interface Window {
    __btWarmupDone?: boolean;
  }
}

const HINT_HOSTS = [
  "https://www.paypal.com",
  "https://www.paypalobjects.com",
  "https://assets.braintreegateway.com",
  "https://client-analytics.braintreegateway.com",
];

function ensureHint(rel: "preconnect" | "dns-prefetch", href: string, crossOrigin?: string) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (rel === "preconnect" && crossOrigin) link.crossOrigin = crossOrigin;
  document.head.appendChild(link);
}

export default function PrefetchBraintreeToken() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 同一个标签页只做一次预热（避免 HMR/重复挂载）
    if (window.__btWarmupDone) return;
    window.__btWarmupDone = true;

    // 1) 资源提示：预热 DNS/TLS
    HINT_HOSTS.forEach((h) => {
      ensureHint("dns-prefetch", h);
      ensureHint("preconnect", h, "anonymous");
    });

    // 2) 并发：预取 token + 预热 Drop-in 包（放进浏览器模块缓存）
    prefetchBraintreeToken().catch(() => {});
    // 不阻塞主线程：失败也静默，后续真正创建时还会再加载
    import("braintree-web-drop-in").catch(() => {});

    // （可选）如果你想等到浏览器空闲再预热，可改成：
    // const idle = (cb: () => void) =>
    //   ("requestIdleCallback" in window
    //     ? (window as any).requestIdleCallback(cb, { timeout: 500 })
    //     : setTimeout(cb, 0));
    // idle(() => import("braintree-web-drop-in").catch(() => {}));
  }, []);

  return null;
}
