// src/app/(shop)/checkout/checkout-browser-effects.ts

import { coerceCountryCode } from "@/lib/country";

type SupportedCountryCode = Parameters<typeof coerceCountryCode>[1];

export function addCheckoutPaymentPreconnectHints() {
  const hosts = [
    "https://www.paypal.com",
    "https://www.paypalobjects.com",
    "https://assets.braintreegateway.com",
    "https://client-analytics.braintreegateway.com",
  ];

  hosts.forEach((h) => {
    if (!document.querySelector(`link[rel="preconnect"][href="${h}"]`)) {
      const pre = document.createElement("link");
      pre.rel = "preconnect";
      pre.href = h;
      pre.crossOrigin = "anonymous";
      document.head.appendChild(pre);
    }

    if (!document.querySelector(`link[rel="dns-prefetch"][href="${h}"]`)) {
      const dns = document.createElement("link");
      dns.rel = "dns-prefetch";
      dns.href = h;
      document.head.appendChild(dns);
    }
  });
}

export function restoreCheckoutAddressFromStorage(args: {
  storageKey: string;
  fallbackCountry?: SupportedCountryCode;
  setAddress: (updater: any) => void;
}) {
  try {
    const rawAddr = localStorage.getItem(args.storageKey);
    if (!rawAddr) return;

    const a = JSON.parse(rawAddr) as any;

    // ✅ country 统一清洗成 ISO2（AU/NZ/...）
    const countryCode = coerceCountryCode(a?.country, args.fallbackCountry || "AU");

    // ✅ localStorage 里的 address 仅用于“游客邮箱 + 地址信息”恢复
    // 不把登录账户邮箱强塞进 address.email
    const cleaned = { ...a, country: countryCode };

    try {
      localStorage.setItem(args.storageKey, JSON.stringify(cleaned));
    } catch {}

    args.setAddress((prev: any) => (Object.keys(prev || {}).length ? prev : cleaned));
  } catch (err) {
    console.warn("[checkout] restore local address failed:", err);
  }
}

export function attachCheckoutAuthSyncListeners(args: {
  syncAuthState: () => void | Promise<unknown>;
}) {
  const handleFocus = () => {
    void args.syncAuthState();
  };

  const handleAuthChanged = () => {
    void args.syncAuthState();
  };

  window.addEventListener("focus", handleFocus);
  window.addEventListener("sp-auth-changed", handleAuthChanged as EventListener);

  return () => {
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("sp-auth-changed", handleAuthChanged as EventListener);
  };
}