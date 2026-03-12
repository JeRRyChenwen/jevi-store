// src/app/(shop)/checkout/checkout-navigation.ts

import type { StepKey } from "./types";

export function getNextCheckoutStep(step: StepKey): StepKey {
  return step === "bag"
    ? "address"
    : step === "address"
      ? "delivery"
      : "payment";
}

export function getPrevCheckoutStep(step: StepKey): StepKey {
  return step === "payment"
    ? "delivery"
    : step === "delivery"
      ? "address"
      : "bag";
}

export function setCheckoutStepAndURL(args: {
  next: StepKey;
  pathname: string;
  search: string;
  replace: (href: string, opts?: { scroll?: boolean }) => void;
  setStep: (next: StepKey) => void;
  setContinueErrMsg: (msg: string | null) => void;
  setPayPersistErrMsg?: (msg: string | null) => void;
}) {
  args.setStep(args.next);

  const p = new URLSearchParams(args.search);
  p.set("step", args.next);

  args.replace(`${args.pathname}?${p.toString()}`, { scroll: false });
  args.setContinueErrMsg(null);

  if (args.next !== "payment") {
    args.setPayPersistErrMsg?.(null);
  }
}

export function goToCheckoutLogin(args: {
  push: (href: string) => void;
  next?: string;
}) {
  const next = args.next || "/checkout?step=address";
  args.push(`/auth/login?next=${encodeURIComponent(next)}`);
}