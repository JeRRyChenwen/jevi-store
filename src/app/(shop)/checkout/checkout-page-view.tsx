"use client";

import PageBack from "@/components/PageBack";
import { Alert } from "@/components/ui/alert";
import BagStep from "./_components/BagStep";
import AddressStep from "./_components/AddressStep";
import DeliveryStep from "./_components/DeliveryStep";
import PaymentStep from "./_components/PaymentStep";
import CheckoutSteps from "./_components/CheckoutSteps";
import {
  LargeBackButton,
  LargeGhostButton,
  LargePrimaryButton,
} from "./_components/CheckoutButtons";
import type { StepKey } from "./types";

type CheckoutPageViewProps = {
  step: StepKey;
  setStepAndURL: (next: StepKey) => void;

  bagStepProps: any;
  addressStepProps: any;
  deliveryStepProps: any;
  paymentStepProps: any;

  payPersistErrMsg: string | null;

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

export default function CheckoutPageView({
  step,
  setStepAndURL,
  bagStepProps,
  addressStepProps,
  deliveryStepProps,
  paymentStepProps,
  payPersistErrMsg,
  isLoggedIn,
  handleLoginAndContinue,
  handleContinue,
  prevStep,
  blockContinue,
  continueText,
  formAlertHasAlert,
  formAlertMessage,
  alertVariant,
}: CheckoutPageViewProps) {
  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      <div className="mx-auto w-full max-w-[2300px]">
        <div className="mb-5">
          <PageBack />
        </div>

        <CheckoutSteps step={step} onChange={setStepAndURL} />

        <div className="space-y-6">
          {step === "bag" && <BagStep {...bagStepProps} />}

          {step === "address" && <AddressStep {...addressStepProps} />}

          {step === "delivery" && (
            <div className="space-y-3">
              <DeliveryStep {...deliveryStepProps} />
            </div>
          )}

          {step === "payment" && payPersistErrMsg ? (
            <div className="px-4">
              <Alert variant={"error" as any}>{payPersistErrMsg}</Alert>
            </div>
          ) : null}

          <PaymentStep {...paymentStepProps} />

          {step === "payment" && (
            <div className="px-4 pb-4 pt-2 flex justify-end">
              <div className="w-[320px] max-w-full">
                <LargeBackButton onClick={() => setStepAndURL("delivery")} />
              </div>
            </div>
          )}
        </div>

        {step !== "payment" && (
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
        )}
      </div>
    </main>
  );
}