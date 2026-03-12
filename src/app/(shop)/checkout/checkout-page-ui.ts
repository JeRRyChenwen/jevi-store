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
}: {
  step: StepKey;
  reserveLoading: boolean;
}) {
  const blockContinue = step === "delivery" && reserveLoading;
  const continueText = blockContinue ? "Reserving..." : "Continue";

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