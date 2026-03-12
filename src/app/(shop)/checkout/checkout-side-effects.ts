// src/app/(shop)/checkout/checkout-side-effects.ts

import { getSessionUser } from "@/lib/auth";
import type { StepKey } from "./types";

export async function syncCheckoutAuthState(args: {
  setIsLoggedIn: (value: boolean) => void;
  setAccountEmail: (value: string) => void;
}) {
  try {
    const user = await getSessionUser(true);

    // ✅ 调试：看看 /api/auth/me 实际返回的 user
    console.log("[checkout] session user =", user);

    const email = String(user?.email || "").trim().toLowerCase();
    const loggedIn = !!user?.id && !!email;

    console.log("[checkout] computed login state =", {
      loggedIn,
      email,
    });

    args.setIsLoggedIn(loggedIn);
    args.setAccountEmail(loggedIn ? email : "");
  } catch (err) {
    console.warn("[checkout] syncAuthState failed:", err);
    args.setIsLoggedIn(false);
    args.setAccountEmail("");
  }
}

export async function sendCheckoutSubscriptionIfNeeded(args: {
  emailRaw?: string;
  accountEmail?: string | null;
  addressEmail?: string | null;
  marketingOptIn: boolean;
  step: StepKey;
  clientTZ: string;
  clientUTCOffsetMin: number;
  forceTZ: string;
  remoteBase: string;
  apiURL: (path: string) => string;
}) {
  try {
    // ✅ 邮箱来源优先级：
    // 1. 显式传入的 emailRaw（例如游客在 AddressStep blur 时）
    // 2. 登录用户账户邮箱 accountEmail
    // 3. 游客地址里的 address.email
    const email = String(
      args.emailRaw || args.accountEmail || args.addressEmail || ""
    )
      .trim()
      .toLowerCase();

    if (!email) return;

    const payload = {
      email,
      marketing_opt_in: !!args.marketingOptIn,
      source: "checkout",
      tz: args.forceTZ,
      meta: {
        path: "/checkout",
        step: args.step,
        ts: Date.now(),
        tz: args.forceTZ,
        client_tz: args.clientTZ,
        utc_offset_min: args.clientUTCOffsetMin,
      },
    };

    const jsonBlob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });

    if (args.remoteBase) {
      const ok =
        typeof navigator !== "undefined" &&
        navigator.sendBeacon?.(`${args.remoteBase}/subscribe`, jsonBlob);
      if (ok) return;
    }

    const okLocal =
      typeof navigator !== "undefined" &&
      navigator.sendBeacon?.(args.apiURL("/subscribe"), jsonBlob);
    if (okLocal) return;

    setTimeout(() => {
      const target = args.remoteBase
        ? `${args.remoteBase}/subscribe`
        : args.apiURL("/subscribe");

      fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }, 0);
  } catch {}
}