// src/app/checkout/_components/PayPalPreloader.tsx
"use client";

import { useEffect } from "react";
import { preloadPaypalForBraintree } from "@/lib/paypalPreloader";
import { prefetchBraintreeToken } from "@/lib/braintreeToken";

type Props = { currency?: string };

declare global {
  interface Window {
    __btTokenPromise?: Promise<string>;     // 和 PrefetchBraintreeToken 共享
    __paypalWarmupPromise?: Promise<void>;  // 本组件自己的单航班
  }
}

const STORAGE_KEY = "bt:clientToken";

/**
 * 确保 token 仅请求一次：
 * - 先读 sessionStorage
 * - 没有则复用全局在途 Promise（若不存在再触发 prefetch）
 */
async function ensureTokenOnce(): Promise<string> {
  if (typeof window === "undefined") return "";

  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  if (!window.__btTokenPromise) {
    // 还没人触发，交给预取工具函数发起唯一一次请求
    window.__btTokenPromise = (async () => {
      try {
        const res = await prefetchBraintreeToken();
        const token =
          typeof res === "string" ? res : (res as any)?.clientToken || "";
        if (token) sessionStorage.setItem(STORAGE_KEY, token);
        return token;
      } catch (e) {
        // 失败要清理，允许后续重试
        delete window.__btTokenPromise;
        throw e;
      }
    })();
  }

  const t = await window.__btTokenPromise.catch(() => "");
  if (t) sessionStorage.setItem(STORAGE_KEY, t);
  return t;
}

export default function PayPalPreloader({ currency = "AUD" }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 同一标签页仅预热一次
    if (!window.__paypalWarmupPromise) {
      window.__paypalWarmupPromise = (async () => {
        try {
          // 先把 token 准备好（避免 preload 内部再去取）
          await ensureTokenOnce();

          // 再静默预加载 PayPal SDK / Braintree 相关资源
          await preloadPaypalForBraintree(currency);
        } catch {
          // 失败静默，不阻塞页面；后续组件仍可兜底重试
        }
      })();
    }
  }, [currency]);

  return null; // 不渲染任何 UI
}
