"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
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
  const [showShippingPromotionDetails, setShowShippingPromotionDetails] =
    useState(false);

  if (step === "payment") return null;

  return (
    <>
      {step === "delivery" ? (
        <>
          {/* =========================
              手机端：
              Details
              展开说明
              Back / Continue
          ========================== */}
          <div className="mt-6 md:hidden">
            <button
              type="button"
              onClick={() =>
                setShowShippingPromotionDetails((current) => !current)
              }
              aria-expanded={showShippingPromotionDetails}
              className={[
                "inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1",
                "text-sm text-neutral-600 transition-colors",
                "hover:text-neutral-900",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
              ].join(" ")}
            >
              <Info className="h-4 w-4 shrink-0" />

              <span>Shipping promotion details</span>

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 transition-transform",
                  showShippingPromotionDetails ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {showShippingPromotionDetails ? (
              <div className="mt-3">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" />

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-900">
                        Shipping promotion
                      </div>

                      <div className="mt-3 space-y-3 text-xs leading-5 text-neutral-600">
                        <div>
                          <div className="font-medium text-neutral-900">
                            Standard delivery
                          </div>

                          <div className="mt-1">
                            Tier 1–2: Free shipping on orders of AUD 200 or
                            more.
                          </div>

                          <div>
                            Tier 3 and Australia Fallback: 50% off shipping on
                            orders of AUD 200 or more.
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-neutral-900">
                            Express delivery
                          </div>

                          <div className="mt-1">
                            50% off shipping on orders of AUD 200 or more for
                            eligible Australian destinations.
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-neutral-200 pt-2 text-[11px] leading-4 text-neutral-500">
                        This promotion applies only to eligible Australian
                        orders charged in AUD.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid w-full grid-cols-2 gap-3">
              <LargeBackButton onClick={prevStep} />

              <LargePrimaryButton
                onClick={handleContinue}
                disabled={blockContinue}
              >
                {continueText}
              </LargePrimaryButton>
            </div>
          </div>

          {/* =========================
              电脑端：
              Details + Back / Continue 同一行
              展开说明在整行下方
          ========================== */}
          <div className="mt-6 hidden md:block">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() =>
                  setShowShippingPromotionDetails((current) => !current)
                }
                aria-expanded={showShippingPromotionDetails}
                className={[
                  "inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-1",
                  "text-sm text-neutral-600 transition-colors",
                  "hover:text-neutral-900",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
                ].join(" ")}
              >
                <Info className="h-4 w-4 shrink-0" />

                <span>Shipping promotion details</span>

                <ChevronDown
                  className={[
                    "h-4 w-4 shrink-0 transition-transform",
                    showShippingPromotionDetails ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>

              <div className="flex w-[660px] max-w-full justify-end gap-3">
                <LargeBackButton onClick={prevStep} />

                <LargePrimaryButton
                  onClick={handleContinue}
                  disabled={blockContinue}
                >
                  {continueText}
                </LargePrimaryButton>
              </div>
            </div>

            {showShippingPromotionDetails ? (
              <div className="mt-3">
                <div className="max-w-[760px] rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" />

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-900">
                        Shipping promotion
                      </div>

                      <div className="mt-2 grid gap-3 text-xs leading-5 text-neutral-600 sm:grid-cols-2">
                        <div>
                          <div className="font-medium text-neutral-900">
                            Standard delivery
                          </div>

                          <div className="mt-1">
                            Tier 1–2: Free shipping on orders of AUD 200 or
                            more.
                          </div>

                          <div>
                            Tier 3 and Australia Fallback: 50% off shipping on
                            orders of AUD 200 or more.
                          </div>
                        </div>

                        <div>
                          <div className="font-medium text-neutral-900">
                            Express delivery
                          </div>

                          <div className="mt-1">
                            50% off shipping on orders of AUD 200 or more for
                            eligible Australian destinations.
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 border-t border-neutral-200 pt-2 text-[11px] leading-4 text-neutral-500">
                        This promotion applies only to eligible Australian
                        orders charged in AUD.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-6 flex justify-end">
          {step === "bag" ? (
            <>
              {/* 手机端 Bag */}
              <div className="grid w-full grid-cols-2 gap-3 md:hidden">
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

              {/* 电脑端 Bag */}
              <div
                className={[
                  "hidden md:flex",
                  isLoggedIn
                    ? "w-[320px] max-w-full"
                    : "w-[660px] max-w-full justify-end gap-3",
                ].join(" ")}
              >
                {!isLoggedIn ? (
                  <div className="w-[320px]">
                    <LargeGhostButton onClick={handleLoginAndContinue}>
                      Login / Sign up and Continue
                    </LargeGhostButton>
                  </div>
                ) : null}

                <div className="w-[320px]">
                  <LargePrimaryButton onClick={handleContinue}>
                    Continue
                  </LargePrimaryButton>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 手机端 Address */}
              <div className="grid w-full grid-cols-2 gap-3 md:hidden">
                <LargeBackButton onClick={prevStep} />

                <LargePrimaryButton
                  onClick={handleContinue}
                  disabled={blockContinue}
                >
                  {continueText}
                </LargePrimaryButton>
              </div>

              {/* 电脑端 Address */}
              <div className="hidden w-[660px] max-w-full justify-end gap-3 md:flex">
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
      )}

      {(step === "bag" || step === "address") &&
      formAlertHasAlert &&
      formAlertMessage ? (
        <div className="mt-2 flex justify-end">
          <div
            className={
              step === "bag"
                ? "w-full max-w-full md:w-[320px]"
                : "w-full max-w-full md:w-[660px]"
            }
          >
            <Alert variant={alertVariant as any}>{formAlertMessage}</Alert>
          </div>
        </div>
      ) : null}
    </>
  );
}
