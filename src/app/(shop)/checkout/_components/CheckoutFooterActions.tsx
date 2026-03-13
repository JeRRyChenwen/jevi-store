"use client";

import { Alert } from "@/components/ui/alert";
import {
  LargeBackButton,
  LargeGhostButton,
  LargePrimaryButton,
} from "./CheckoutButtons";
import type { StepKey } from "../types";

type CheckoutFooterActionsProps = {
  step: StepKey;
  isLoggedIn: boolean;
  handleLoginAndContinue: () => void;
  handleContinue: () => void;
  prevStep: () => void;
  blockContinue: boolean;
  continueText: string;
  formAlertHasAlert: boolean;
  formAlertMessage?: string;
  alertVariant: any;
};

export default function CheckoutFooterActions({
  step,
  isLoggedIn,
  handleLoginAndContinue,
  handleContinue,
  prevStep,
  blockContinue,
  continueText,
  formAlertHasAlert,
  formAlertMessage,
  alertVariant,
}: CheckoutFooterActionsProps) {
  if (step === "payment") return null;

  return (
    <>
      <div className="mt-6 flex justify-end">
        {step === "bag" ? (
          <div
            className={
              isLoggedIn
                ? "w-[320px] max-w-full"
                : "w-[660px] max-w-full flex gap-3 justify-end"
            }
          >
            {!isLoggedIn && (
              <div className="w-[320px]">
                <LargeGhostButton onClick={handleLoginAndContinue}>
                  Login / Sign up and Continue
                </LargeGhostButton>
              </div>
            )}

            <div className="w-[320px]">
              <LargePrimaryButton onClick={handleContinue}>
                Continue
              </LargePrimaryButton>
            </div>
          </div>
        ) : (
          <div className="w-[660px] max-w-full flex gap-3 justify-end">
            <LargeBackButton onClick={prevStep} />

            <LargePrimaryButton
              onClick={handleContinue}
              disabled={blockContinue}
            >
              {continueText}
            </LargePrimaryButton>
          </div>
        )}
      </div>

      {(step === "bag" || step === "address") &&
      formAlertHasAlert &&
      formAlertMessage ? (
        <div className="mt-2 flex justify-end">
          <div
            className={
              step === "bag"
                ? "w-[320px] max-w-full"
                : "w-[660px] max-w-full"
            }
          >
            <Alert variant={alertVariant as any}>
              {formAlertMessage}
            </Alert>
          </div>
        </div>
      ) : null}
    </>
  );
}