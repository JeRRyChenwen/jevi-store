// src/app/checkout/_components/PrefetchBraintreeToken.tsx
"use client";

import { useEffect } from "react";
import { prefetchBraintreeToken } from "@/lib/braintreeToken";

// 扩展 window，避免 TS 报错
declare global {
  interface Window {
    __btWarmupDone?: boolean;
    __btWarmupPromise?: Promise<void>;
    __btTokenPromise?: Promise<string>; // 单航班：token 在途 Promise
  }
}

// Braintree/PayPal 可能用到的域名（含 sandbox）
const HINT_HOSTS = [
  // PayPal prod
  "https://www.paypal.com",
  "https://www.paypalobjects.com",
  "https://c.paypal.com",
  // PayPal sandbox
  "https://www.sandbox.paypal.com",
  "https://c.sandbox.paypal.com",
  // Braintree
  "https://assets.braintreegateway.com",
  "https://client-analytics.braintreegateway.com",
];

// 你 UI 里用到的 PayPal 图标，提前预加载避免首渲染抖动
const PAYPAL_ICON = "https://www.paypalobjects.com/webstatic/icon/pp258.png";

// 与其它组件对齐：统一使用这个 key 存储 token
const STORAGE_KEY = "bt:clientToken";

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
  if (rel === "preload" && (opts as any)?.as) {
    (link as any).as = opts!.as!;
  }
  if (opts?.fetchPriority) {
    (link as any).fetchPriority = opts.fetchPriority;
  }
  document.head.appendChild(link);
}

/**
 * 确保全局只请求一次 token：
 * - 优先读 sessionStorage
 * - 若没有，复用 window.__btTokenPromise
 * - 最后才真正调用 prefetchBraintreeToken()
 */
async function ensureTokenOnce(): Promise<string> {
  if (typeof window === "undefined") return "";

  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  if (window.__btTokenPromise) {
    const t = await window.__btTokenPromise.catch(() => "");
    if (t) sessionStorage.setItem(STORAGE_KEY, t);
    return t;
  }

  window.__btTokenPromise = (async () => {
    try {
      const res = await prefetchBraintreeToken();
      // 兼容工具函数返回 string 或 { clientToken }
      const token =
        typeof res === "string" ? res : (res as any)?.clientToken || "";
      if (token) sessionStorage.setItem(STORAGE_KEY, token);
      return token;
    } catch (e) {
      console.error("[bt] token prefetch failed:", e);
      // 失败时清理，允许后续重试
      delete window.__btTokenPromise;
      return "";
    }
  })();

  return window.__btTokenPromise;
}

export default function PrefetchBraintreeToken() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 同一标签页只执行一次预热
    if (window.__btWarmupDone || window.__btWarmupPromise) return;

    window.__btWarmupPromise = (async () => {
      // 1) 预热 DNS/TLS
      HINT_HOSTS.forEach((h) => {
        ensureHint("dns-prefetch", h);
        ensureHint("preconnect", h, { crossOrigin: "anonymous" });
      });

      // 2) 预加载 PayPal 图标，减少首次闪烁
      ensureHint("preload", PAYPAL_ICON, { as: "image", fetchPriority: "low" });
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = PAYPAL_ICON;
      } catch {}

      // 3) 并发：确保 token 只请求一次 + 预热 drop-in 包
      const tasks: Promise<any>[] = [ensureTokenOnce()];

      const effectiveType = (navigator as any)?.connection?.effectiveType || "";
      const saveData = (navigator as any)?.connection?.saveData || false;
      const warmDropin = () => import("braintree-web-drop-in").catch(() => {});

      if (!saveData && !/2g/i.test(effectiveType)) {
        // 网络较好：直接预热
        tasks.push(warmDropin());
      } else {
        // 低网/省流：空闲时再预热
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
