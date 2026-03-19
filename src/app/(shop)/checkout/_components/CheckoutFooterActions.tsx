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
          <>
            {/* =========================
                手机端：
                - 统一使用两列 grid
                - 已登录：左空右 Continue
                - 未登录：左 Login / Sign up，右 Continue
                桌面端：保持你原来的宽度逻辑
            ========================== */}
            <div className="grid grid-cols-2 gap-3 w-full md:hidden">
              {!isLoggedIn ? (
                <>
                  <LargeGhostButton onClick={handleLoginAndContinue}>
                    Login / Sign up and Continue
                  </LargeGhostButton>

                  <LargePrimaryButton onClick={handleContinue}>
                    Continue
                  </LargePrimaryButton>
                </>
              ) : (
                <>
                  <div />
                  <LargePrimaryButton onClick={handleContinue}>
                    Continue
                  </LargePrimaryButton>
                </>
              )}
            </div>

            <div
              className={[
                "hidden md:flex",
                isLoggedIn
                  ? "w-[320px] max-w-full"
                  : "w-[660px] max-w-full gap-3 justify-end",
              ].join(" ")}
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
          </>
        ) : (
          <>
            {/* 手机端：统一两列，Back / Continue */}
            <div className="grid grid-cols-2 gap-3 w-full md:hidden">
              <LargeBackButton onClick={prevStep} />

              <LargePrimaryButton
                onClick={handleContinue}
                disabled={blockContinue}
              >
                {continueText}
              </LargePrimaryButton>
            </div>

            {/* 桌面端：保持原样 */}
            <div className="hidden md:flex w-[660px] max-w-full gap-3 justify-end">
              <LargeBackButton onClick={prevStep} />

              <LargePrimaryButton
                onClick={handleContinue}
                disabled={blockContinue}
              >
                {continueText}
              </LargePrimaryButton>
            </div>
          </>
        )}
      </div>

      {(step === "bag" || step === "address") &&
      formAlertHasAlert &&
      formAlertMessage ? (
        <div className="mt-2 flex justify-end">
          <div
            className={
              step === "bag"
                ? "w-full md:w-[320px] max-w-full"
                : "w-full md:w-[660px] max-w-full"
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