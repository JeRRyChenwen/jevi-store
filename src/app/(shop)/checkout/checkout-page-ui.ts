// src/app/(shop)/checkout/checkout-page-ui.ts
import { goToCheckoutLogin } from "./checkout-navigation";
import type { StepKey } from "./types";

export function getCheckoutAlertVariant(alertType?: string | null) {
  if (alertType === "success") return "success";
  if (alertType === "warning") return "warning";
  if (alertType === "info") return "info";
  return "error";
}

export function getCheckoutContinueButtonState({
  step,
  reserveLoading,
  quoteLoading,
  quoteError,
}: {
  step: StepKey;
  reserveLoading: boolean;
  quoteLoading?: boolean;
  quoteError?: string | null;
}) {
  const blockContinue =
    step === "delivery" &&
    (reserveLoading || !!quoteLoading || !!quoteError);

  const continueText =
    step === "delivery" && reserveLoading
      ? "Reserving..."
      : step === "delivery" && quoteLoading
        ? "Calculating shipping..."
        : "Continue";

  return {
    blockContinue,
    continueText,
  };
}

export function handleCheckoutLoginAndContinue(push: (href: string) => void) {
  goToCheckoutLogin({
    push,
    next: "/checkout?step=address",
  });
}