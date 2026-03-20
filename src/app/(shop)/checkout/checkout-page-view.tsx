"use client";

import BackButton from "@/components/navigation/BackButton";
import { Alert } from "@/components/ui/alert";
import BagStep from "./_components/BagStep";
import AddressStep from "./_components/AddressStep";
import DeliveryStep from "./_components/DeliveryStep";
import PaymentStep from "./_components/PaymentStep";
import CheckoutSteps from "./_components/CheckoutSteps";
import { LargeBackButton } from "./_components/CheckoutButtons";
import CheckoutFooterActions from "./_components/CheckoutFooterActions";
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
    <main className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 py-4 md:py-8">
      <div className="mx-auto w-full max-w-[2300px]">
        <div className="mb-4">
          <BackButton
            label="Back"
            forceHref="/"
            variant="chip"
          />
        </div>

        <CheckoutSteps step={step} onChange={setStepAndURL} />

        <div className="space-y-4 md:space-y-6">
          {step === "bag" && <BagStep {...bagStepProps} />}

          {step === "address" && <AddressStep {...addressStepProps} />}

          {step === "delivery" && (
            <div className="space-y-3">
              <DeliveryStep {...deliveryStepProps} />
            </div>
          )}

          {step === "payment" && payPersistErrMsg ? (
            <div className="px-1 md:px-4">
              <Alert variant={"error" as any}>{payPersistErrMsg}</Alert>
            </div>
          ) : null}

          <PaymentStep {...paymentStepProps} />

          {step === "payment" && (
            <div className="px-1 md:px-4 pb-3 md:pb-4 pt-1 md:pt-2 flex justify-end">
              <div className="w-full md:w-[320px] max-w-full">
                <LargeBackButton onClick={() => setStepAndURL("delivery")} />
              </div>
            </div>
          )}
        </div>

        <CheckoutFooterActions
          step={step}
          isLoggedIn={isLoggedIn}
          handleLoginAndContinue={handleLoginAndContinue}
          handleContinue={handleContinue}
          prevStep={prevStep}
          blockContinue={blockContinue}
          continueText={continueText}
          formAlertHasAlert={formAlertHasAlert}
          formAlertMessage={formAlertMessage}
          alertVariant={alertVariant}
        />
      </div>
    </main>
  );
}