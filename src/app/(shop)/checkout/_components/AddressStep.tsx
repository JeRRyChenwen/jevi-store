// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\AddressStep.tsx
"use client";

import React, { useMemo, useRef } from "react";
import { Alert } from "@/components/ui/alert";

import type {
  Address,
  AddressStepProps,
} from "./address-step.types";

import {
  hasAnyErr,
  fieldErrorText,
  clsInput,
} from "./address-step.utils";

import { InlineError, RequiredStar } from "./AddressFieldParts";
import AddressForm from "./AddressForm";
import BillingForm from "./BillingForm";


/* ---------------- AddressStep 主组件 ---------------- */
const AddressStep: React.FC<AddressStepProps> = ({
  isLoggedIn,
  accountEmail,

  address,
  setAddress,

  billingAddress,
  setBillingAddress,

  countryOptions,

  sameAsDelivery,
  setSameAsDelivery,

  hasSavedDelivery,
  hasSavedBilling,
  savedDeliveryAddr,
  savedBillingAddr,
  useSavedDelivery,
  setUseSavedDelivery,
  useSavedBilling,
  setUseSavedBilling,

  addressShowErrors,
  addressErrs,
  billingErrs,
  handleBillingFieldChange,

  clearAddressErrors,
  clearBillingErrors,

  saveMsg,
  onSaveDefault,

  marketingOptIn,
  setMarketingOptIn,
  sendSubscriptionIfNeeded,
}) => {
  const effectiveHasSavedDelivery = hasSavedDelivery || !!savedDeliveryAddr;
  const effectiveHasSavedBilling = hasSavedBilling || !!savedBillingAddr;

  const deliveryDraftRef = useRef<Address | null>(null);
  const billingDraftRef = useRef<Address | null>(null);

  const includeEmailErr = !isLoggedIn;

  const showDeliverySummary = useMemo(() => {
    return addressShowErrors && hasAnyErr(addressErrs, includeEmailErr);
  }, [addressShowErrors, addressErrs, includeEmailErr]);

  const showBillingSummary = useMemo(() => {
    return addressShowErrors && !sameAsDelivery && !useSavedBilling && hasAnyErr(billingErrs, false);
  }, [addressShowErrors, billingErrs, sameAsDelivery, useSavedBilling]);

  return (
    <>
      {(effectiveHasSavedDelivery || effectiveHasSavedBilling) && (
        <section className="rounded-xl border" id="use-saved-addresses">
          <div className="border-b px-4 py-3 font-semibold">Use Saved Addresses</div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-neutral-600">
              You can choose to use your saved Delivery and/or Billing addresses below.
            </p>

            <div className="flex flex-col gap-2 mt-2">
              {effectiveHasSavedDelivery && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useSavedDelivery}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      if (checked) {
                        deliveryDraftRef.current = { ...address };
                        if (savedDeliveryAddr) {
                          setAddress(savedDeliveryAddr);
                          clearAddressErrors();
                        }
                      } else {
                        if (deliveryDraftRef.current) {
                          setAddress(deliveryDraftRef.current);
                        }
                      }

                      setUseSavedDelivery(checked);
                    }}
                  />
                  Use saved <strong>Delivery Address</strong>
                </label>
              )}

              {effectiveHasSavedBilling && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useSavedBilling}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      if (checked) {
                        billingDraftRef.current = { ...billingAddress };
                        if (savedBillingAddr) {
                          setBillingAddress(savedBillingAddr);
                          clearBillingErrors();
                        }
                      } else {
                        if (billingDraftRef.current) {
                          setBillingAddress(billingDraftRef.current);
                        }
                      }

                      setUseSavedBilling(checked);
                    }}
                  />
                  Use saved <strong>Billing Address</strong>
                </label>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="h-4" />

      {/* ✅ 独立的 Your Details 区域
          - 放在 Use Saved Addresses 下方
          - 放在 Address & Billing 上方
          - 即使勾选 Use saved Delivery Address 也始终显示
      */}
      <section className="rounded-xl border" id="your-details-section">
        <div className="border-b px-4 py-3 font-semibold">Your Details</div>

        <div className="p-4">
          {isLoggedIn ? (
            <>
              <p className="text-sm text-neutral-600 mb-3">
                Your order confirmation will be sent to your account email.
              </p>

              <div className="rounded-md border bg-neutral-50 px-3 py-2">
                <div className="text-xs text-neutral-500 mb-1">Account Email</div>
                <div className="text-sm font-medium text-neutral-900 break-all">
                  {accountEmail || "No account email found"}
                </div>
              </div>

              <p className="mt-2 text-xs text-neutral-500">
                To change your email, please update it in your account settings.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-600 mb-3">
                Please enter your email address, we&apos;ll send your order confirmation here.
              </p>

              <label htmlFor="checkout-account-email" className="block text-sm font-medium mb-1">
                Email Address <RequiredStar />
              </label>
              <input
                id="checkout-account-email"
                type="email"
                className={clsInput(addressShowErrors, addressErrs.email)}
                autoComplete="email"
                value={address.email || ""}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setAddress({ ...address, email: v });
                }}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v !== String(address.email || "").trim()) {
                    setAddress({ ...address, email: v });
                  }

                  void sendSubscriptionIfNeeded(v);
                }}
                aria-invalid={addressShowErrors && addressErrs.email ? true : undefined}
                aria-describedby="err-checkout-account-email"
              />
              <InlineError
                show={addressShowErrors && addressErrs.email}
                id="err-checkout-account-email"
                text={fieldErrorText("email")}
              />

              <p className="mt-1 text-xs text-neutral-500">
                You can create an account after checkout.
              </p>

              {/* ✅ 仅未登录用户显示营销订阅与隐私说明 */}
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={marketingOptIn}
                  onChange={(e) => {
                    const v = e.currentTarget.checked;
                    setMarketingOptIn(v);
                    void sendSubscriptionIfNeeded();
                  }}
                />
                <span>Email me updates on New Arrivals, Sale and Offers</span>
              </label>

              <p className="mt-3 text-xs text-neutral-500">
                * We treat your personal data with care, view our{" "}
                <a className="underline" href="/privacy">
                  Privacy Policy
                </a>
                .
              </p>
            </>
          )}
        </div>
      </section>

      <div className="h-4" />

      {!(useSavedDelivery && useSavedBilling) && (
        <section className="rounded-xl border pb-8" id="address-section">
          <div className="border-b px-4 py-3 font-semibold">Address & Billing</div>

          <div className="p-4 space-y-6">
            {!useSavedDelivery && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-medium">Delivery Address</h3>
                  {showDeliverySummary ? (
                    <span className="text-xs text-red-600">Missing or invalid fields</span>
                  ) : null}
                </div>

                <AddressForm
                  address={address}
                  setAddress={setAddress}
                  marketingOptIn={marketingOptIn}
                  setMarketingOptIn={setMarketingOptIn}
                  showErrors={addressShowErrors}
                  errs={addressErrs}
                  onEmailCommit={(email) => sendSubscriptionIfNeeded(email)}
                  onOptInChanged={() => sendSubscriptionIfNeeded()}
                  hideYourDetails={isLoggedIn}
                  accountEmail={accountEmail}
                  variant="bare"
                  countryOptions={countryOptions}
                />
              </div>
            )}

            {!useSavedBilling && (
              <div className="rounded-lg border p-4">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={sameAsDelivery}
                    onChange={(e) => setSameAsDelivery(e.currentTarget.checked)}
                  />
                  <span>
                    Billing address is the same as delivery address
                    <p className="mt-1 text-xs text-neutral-500">
                      If unchecked, you can enter a different billing address below.
                    </p>
                  </span>
                </label>
              </div>
            )}

            {!sameAsDelivery && !useSavedBilling && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-medium">Billing Address</h3>
                  {showBillingSummary ? (
                    <span className="text-xs text-red-600">Missing or invalid fields</span>
                  ) : null}
                </div>

                <BillingForm
                  billing={billingAddress}
                  setBilling={setBillingAddress}
                  showErrors={addressShowErrors}
                  errs={billingErrs}
                  onFieldChange={handleBillingFieldChange}
                  variant="bare"
                  countryOptions={countryOptions}
                />
              </div>
            )}

            {isLoggedIn && !(useSavedDelivery && useSavedBilling) && (
              <div className="flex justify-end -mt-2 mr-0 sm:mr-6">
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={onSaveDefault}
                    className="w-auto max-w-[150px] rounded-full border bg-white px-2 py-0.5 text-[9px] font-semibold leading-[1.1] text-center whitespace-normal hover:bg-neutral-50 sm:max-w-none sm:px-4 sm:py-2 sm:text-sm sm:leading-normal sm:whitespace-nowrap"
                  >
                    Save delivery address and billing address as default
                  </button>

                  {saveMsg ? (
                    <div className="mt-1 w-full">
                      <Alert variant={saveMsg.kind === "success" ? "success" : "error"}>
                        <span className="text-sm">{saveMsg.text}</span>
                      </Alert>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
};

export default AddressStep;
