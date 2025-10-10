// src/app/checkout/_components/PayPalPreloader.tsx
"use client";

// 仅保留“token 预取”，不再预加载 PayPal SDK，避免重复插入 <script>
import { useEffect } from "react";
import { prefetchBraintreeToken } from "@/lib/braintreeToken";

type Props = { currency?: string };

declare global {
  interface Window {
    __btTokenPromise?: Promise<string>;
    __paypalWarmupPromise?: Promise<void>; // 仍保留占位，但不做 SDK 预热
  }
}

const STORAGE_KEY = "bt:clientToken";

async function ensureTokenOnce(): Promise<string> {
  if (typeof window === "undefined") return "";
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  if (!window.__btTokenPromise) {
    window.__btTokenPromise = (async () => {
      try {
        const res = await prefetchBraintreeToken();
        const token =
          typeof res === "string" ? res : (res as any)?.clientToken || "";
        if (token) sessionStorage.setItem(STORAGE_KEY, token);
        return token;
      } catch (e) {
        delete window.__btTokenPromise;
        throw e;
      }
    })();
  }

  const t = await window.__btTokenPromise.catch(() => "");
  if (t) sessionStorage.setItem(STORAGE_KEY, t);
  return t;
}

export default function PayPalPreloader({ /* currency = "AUD" */ }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 只做一次“token 预取”；SDK 由 Braintree 组件按需加载
    if (!window.__paypalWarmupPromise) {
      window.__paypalWarmupPromise = ensureTokenOnce().then(() => void 0);
    }
  }, []);

  return null;
}
