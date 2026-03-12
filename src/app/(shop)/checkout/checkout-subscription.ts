// src/app/(shop)/checkout/checkout-subscription.ts
import { sendCheckoutSubscriptionIfNeeded } from "./checkout-side-effects";
import type { StepKey } from "./types";

type Params = {
  emailRaw?: string;
  accountEmail: string;
  addressEmail?: string | null;
  marketingOptIn: boolean;
  step: StepKey;
  remoteBase: string;
  apiURL: (path: string) => string;
};

export async function runCheckoutSubscriptionIfNeeded({
  emailRaw,
  accountEmail,
  addressEmail,
  marketingOptIn,
  step,
  remoteBase,
  apiURL,
}: Params) {
  const clientTZ =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";

  const clientUTCOffsetMin = -new Date().getTimezoneOffset();
  const FORCE_CN_TZ = "Asia/Shanghai";

  await sendCheckoutSubscriptionIfNeeded({
    emailRaw,
    accountEmail,
    addressEmail: addressEmail || null,
    marketingOptIn,
    step,
    clientTZ,
    clientUTCOffsetMin,
    forceTZ: FORCE_CN_TZ,
    remoteBase,
    apiURL,
  });
}