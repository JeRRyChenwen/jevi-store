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
  allowedCountries: string[];
  shippingCountryErrorMessage: string;
  setContinueErrMsg: (msg: string | null) => void;
  setAddressErrs: (errs: any) => void;
  setBillingErrs: (errs: any) => void;
  setAddressShowErrors: (show: boolean) => void;
  ensureReserveBeforeNext: () => Promise<any>;
  quoteLoading?: boolean;
  quoteError?: string | null;
  nextStepCore: () => void;
  onDeliveryContinueSuccess: () => void;
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
  allowedCountries,
  shippingCountryErrorMessage,
  setContinueErrMsg,
  setAddressErrs,
  setBillingErrs,
  setAddressShowErrors,
  ensureReserveBeforeNext,
  quoteLoading = false,
  quoteError = null,
  nextStepCore,
  onDeliveryContinueSuccess,
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

    const deliveryRes = validateAddress(address, "", ignoreEmail, allowedCountries);
    const billingRes = sameAsDelivery
      ? { valid: true, errs: emptyErr }
      : validateAddress(billingAddress, "", true, allowedCountries);

    setAddressErrs(deliveryRes.errs);
    setBillingErrs(billingRes.errs);

    if (!deliveryRes.valid || !billingRes.valid) {
      setAddressShowErrors(true);

      const hasCountryError =
        !!deliveryRes.errs.country || !!billingRes.errs.country;

      setContinueErrMsg(
        hasCountryError
          ? shippingCountryErrorMessage
          : "Please complete all required delivery address fields before saving."
      );

      const el = document.getElementById("address-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setContinueErrMsg(null);
    setAddressShowErrors(false);
    setAddressErrs(emptyErr);
    setBillingErrs(emptyErr);

    if (!isLoggedIn) {
      void sendSubscriptionIfNeeded();
    }

    try {
      await ensureReserveBeforeNext();
    } catch {
      setContinueErrMsg(
        "Unable to reserve stock right now. Please check your bag and try again.",
      );
      return;
    }

    nextStepCore();
    return;
  }

  if (step === "delivery") {
    if (quoteLoading) {
      setContinueErrMsg(
        "Please wait while we calculate shipping for your address.",
      );
      return;
    }

    if (quoteError) {
      setContinueErrMsg(quoteError);
      return;
    }

    try {
      await ensureReserveBeforeNext();
    } catch {
      return;
    }

    onDeliveryContinueSuccess();
    nextStepCore();
  }
}