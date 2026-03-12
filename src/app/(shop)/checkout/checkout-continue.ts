// src/app/(shop)/checkout/checkout-continue.ts
import { emptyErr, validateAddress } from "./(hooks)/useAddress";
import type { StepKey } from "./types";

type Params = {
  step: StepKey;
  hasItems: boolean;
  cartLength: number;
  isLoggedIn: boolean;
  address: any;
  billingAddress: any;
  sameAsDelivery: boolean;
  setContinueErrMsg: (msg: string | null) => void;
  setAddressErrs: (errs: any) => void;
  setBillingErrs: (errs: any) => void;
  setAddressShowErrors: (show: boolean) => void;
  ensureReserveBeforeNext: () => Promise<any>;
  nextStepCore: () => void;
  sendSubscriptionIfNeeded: (emailRaw?: string) => Promise<void>;
};

export async function runCheckoutContinue({
  step,
  hasItems,
  cartLength,
  isLoggedIn,
  address,
  billingAddress,
  sameAsDelivery,
  setContinueErrMsg,
  setAddressErrs,
  setBillingErrs,
  setAddressShowErrors,
  ensureReserveBeforeNext,
  nextStepCore,
  sendSubscriptionIfNeeded,
}: Params) {
  if (step === "bag") {
    if (!hasItems || cartLength === 0) {
      setContinueErrMsg("Your bag is empty. Please add at least one item before continuing.");
      return;
    }

    setContinueErrMsg(null);
    nextStepCore();
    return;
  }

  if (step === "address") {
    const ignoreEmail = isLoggedIn || !!(address.email && address.email.trim());

    const deliveryRes = validateAddress(address, "", ignoreEmail);
    const billingRes = sameAsDelivery
      ? { valid: true, errs: emptyErr }
      : validateAddress(billingAddress, "", true);

    setAddressErrs(deliveryRes.errs);
    setBillingErrs(billingRes.errs);

    if (!deliveryRes.valid || !billingRes.valid) {
      setAddressShowErrors(true);
      setContinueErrMsg("Please complete all required delivery address fields before saving.");

      const el = document.getElementById("address-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setContinueErrMsg(null);
    setAddressShowErrors(false);
    setAddressErrs(emptyErr);
    setBillingErrs(emptyErr);

    if (!isLoggedIn) {
      await sendSubscriptionIfNeeded();
    }

    nextStepCore();
    return;
  }

  if (step === "delivery") {
    try {
      await ensureReserveBeforeNext();
    } catch {
      return;
    }

    nextStepCore();
  }
}