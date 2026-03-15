// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\AddressStep.tsx
"use client";

import React, { useMemo, useRef } from "react";
import AddressErrorHint from "./AddressErrorHint";
import { Alert } from "@/components/ui/alert";
import CountrySelect from "@/components/address/CountrySelect";

import type {
  Address,
  AddressErr,
  SaveMsg,
  AddressStepProps,
} from "./address-step.types";

import {
  baseInput,
  hasAnyErr,
  fieldErrorText,
  clsInput,
} from "./address-step.utils";

import { InlineError, RequiredStar } from "./AddressFieldParts";





/* ---------------- Address 表单（UI） ---------------- */
function AddressForm({
  address,
  setAddress,
  marketingOptIn,
  setMarketingOptIn,
  showErrors,
  errs,
  onEmailCommit,
  onOptInChanged,
  hideYourDetails = false,
  accountEmail = "",
  variant = "section",
  title = "Address",
}: {
  address: Address;
  setAddress: (a: Address) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
  showErrors: boolean;
  errs: AddressErr;
  onEmailCommit?: (email: string) => void;
  onOptInChanged?: (opt: boolean) => void;
  hideYourDetails?: boolean;

  // ✅ NEW: 登录用户显示的只读账户邮箱
  accountEmail?: string;

  variant?: "section" | "bare";
  title?: string;
}) {
  const on =
    (k: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setAddress({ ...address, [k]: e.target.value });

  const showSummary = showErrors && hasAnyErr(errs, !hideYourDetails);

  const Inner = (
    <div className="p-4 space-y-6">
      {showSummary && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Please check the highlighted fields below.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-1">
          <label htmlFor="addr-first" className="block text-sm font-medium text-neutral-700">
            First Name <RequiredStar />
          </label>
          <input
            id="addr-first"
            className={clsInput(showErrors, errs.firstName)}
            autoComplete="given-name"
            value={address.firstName || ""}
            onChange={on("firstName")}
            aria-invalid={showErrors && errs.firstName ? true : undefined}
            aria-describedby="err-addr-first"
          />
          <InlineError
            show={showErrors && errs.firstName}
            id="err-addr-first"
            text={fieldErrorText("firstName")}
          />
        </div>

        {/* Last Name */}
        <div className="space-y-1">
          <label htmlFor="addr-last" className="block text-sm font-medium text-neutral-700">
            Last Name <RequiredStar />
          </label>
          <input
            id="addr-last"
            className={clsInput(showErrors, errs.lastName)}
            autoComplete="family-name"
            value={address.lastName || ""}
            onChange={on("lastName")}
            aria-invalid={showErrors && errs.lastName ? true : undefined}
            aria-describedby="err-addr-last"
          />
          <InlineError
            show={showErrors && errs.lastName}
            id="err-addr-last"
            text={fieldErrorText("lastName")}
          />
        </div>

        {/* Phone */}
        <div className="md:col-span-2 space-y-1">
          <label htmlFor="addr-phone" className="block text-sm font-medium text-neutral-700">
            Phone <RequiredStar />
          </label>
          <input
            id="addr-phone"
            className={clsInput(showErrors, errs.phone)}
            autoComplete="tel"
            value={address.phone || ""}
            onChange={on("phone")}
            aria-invalid={showErrors && errs.phone ? true : undefined}
            aria-describedby="err-addr-phone"
          />
          <InlineError
            show={showErrors && errs.phone}
            id="err-addr-phone"
            text={fieldErrorText("phone")}
          />
        </div>

        {/* Line1 */}
        <div className="md:col-span-2 space-y-1">
          <label htmlFor="addr-line1" className="block text-sm font-medium text-neutral-700">
            Address Line 1 <RequiredStar />
          </label>
          <input
            id="addr-line1"
            className={clsInput(showErrors, errs.line1)}
            autoComplete="address-line1"
            value={address.line1 || ""}
            onChange={on("line1")}
            aria-invalid={showErrors && errs.line1 ? true : undefined}
            aria-describedby="err-addr-line1"
          />
          <InlineError
            show={showErrors && errs.line1}
            id="err-addr-line1"
            text={fieldErrorText("line1")}
          />
        </div>

        {/* Line2 */}
        <div className="md:col-span-2 space-y-1">
          <label htmlFor="addr-line2" className="block text-sm font-medium text-neutral-700">
            Address Line 2 (optional)
          </label>
          <input
            id="addr-line2"
            className={baseInput + " border-neutral-300"}
            autoComplete="address-line2"
            value={address.line2 || ""}
            onChange={on("line2")}
          />
        </div>

        {/* City */}
        <div className="space-y-1">
          <label htmlFor="addr-city" className="block text-sm font-medium text-neutral-700">
            City <RequiredStar />
          </label>
          <input
            id="addr-city"
            className={clsInput(showErrors, errs.city)}
            autoComplete="address-level2"
            value={address.city || ""}
            onChange={on("city")}
            aria-invalid={showErrors && errs.city ? true : undefined}
            aria-describedby="err-addr-city"
          />
          <InlineError
            show={showErrors && errs.city}
            id="err-addr-city"
            text={fieldErrorText("city")}
          />
        </div>

        {/* State */}
        <div className="space-y-1">
          <label htmlFor="addr-state" className="block text-sm font-medium text-neutral-700">
            State/Region <RequiredStar />
          </label>
          <input
            id="addr-state"
            className={clsInput(showErrors, errs.state)}
            autoComplete="address-level1"
            value={address.state || ""}
            onChange={on("state")}
            aria-invalid={showErrors && errs.state ? true : undefined}
            aria-describedby="err-addr-state"
          />
          <InlineError
            show={showErrors && errs.state}
            id="err-addr-state"
            text={fieldErrorText("state")}
          />
        </div>

        {/* Postcode */}
        <div className="space-y-1">
          <label htmlFor="addr-postcode" className="block text-sm font-medium text-neutral-700">
            Postcode <RequiredStar />
          </label>
          <input
            id="addr-postcode"
            className={clsInput(showErrors, errs.postcode)}
            autoComplete="postal-code"
            value={address.postcode || ""}
            onChange={on("postcode")}
            aria-invalid={showErrors && errs.postcode ? true : undefined}
            aria-describedby="err-addr-postcode"
          />
          <InlineError
            show={showErrors && errs.postcode}
            id="err-addr-postcode"
            text={fieldErrorText("postcode")}
          />
        </div>

        {/* Country (Reusable Component) */}
        <div className="space-y-1">
          <label htmlFor="addr-country" className="block text-sm font-medium text-neutral-700">
            Country <RequiredStar />
          </label>

          <CountrySelect
            id="addr-country"
            value={address.country || ""}
            onChange={(code) => setAddress({ ...address, country: code })}
            invalid={!!(showErrors && errs.country)}
            describedById="err-addr-country"
            placeholder="Select country"
          />

          <InlineError
            show={showErrors && errs.country}
            id="err-addr-country"
            text={fieldErrorText("country")}
          />
        </div>
      </div>

      
    </div>
  );

  if (variant === "bare") return <>{Inner}</>;

  return (
    <section className="rounded-xl border">
      <div className="border-b px-4 py-3 font-semibold">{title}</div>
      {Inner}
    </section>
  );
}

/* ---------------- Billing 表单（UI） ---------------- */
function BillingForm({
  billing,
  setBilling,
  showErrors,
  errs,
  onFieldChange,
  variant = "section",
  title = "Billing Address",
}: {
  billing: Address;
  setBilling: (a: Address) => void;
  showErrors: boolean;
  errs: AddressErr;
  onFieldChange?: (k: keyof Address, v: string) => void;
  variant?: "section" | "bare";
  title?: string;
}) {
  const on =
    (k: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setBilling({ ...billing, [k]: v });
      if (showErrors) onFieldChange?.(k, v);
    };

  const showSummary = showErrors && hasAnyErr(errs, false);

  const Inner = (
    <div className="p-4 space-y-6">
      {showSummary && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Please check the highlighted billing fields below.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            First Name <RequiredStar />
          </label>
          <input
            className={clsInput(showErrors, errs.firstName)}
            value={billing.firstName || ""}
            onChange={on("firstName")}
            aria-invalid={showErrors && errs.firstName ? true : undefined}
            aria-describedby="err-bill-first"
          />
          <InlineError
            show={showErrors && errs.firstName}
            id="err-bill-first"
            text={fieldErrorText("firstName")}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            Last Name <RequiredStar />
          </label>
          <input
            className={clsInput(showErrors, errs.lastName)}
            value={billing.lastName || ""}
            onChange={on("lastName")}
            aria-invalid={showErrors && errs.lastName ? true : undefined}
            aria-describedby="err-bill-last"
          />
          <InlineError
            show={showErrors && errs.lastName}
            id="err-bill-last"
            text={fieldErrorText("lastName")}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            Phone <RequiredStar />
          </label>
          <input
            className={clsInput(showErrors, errs.phone)}
            value={billing.phone || ""}
            onChange={on("phone")}
            aria-invalid={showErrors && errs.phone ? true : undefined}
            aria-describedby="err-bill-phone"
          />
          <InlineError
            show={showErrors && errs.phone}
            id="err-bill-phone"
            text={fieldErrorText("phone")}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            Address Line 1 <RequiredStar />
          </label>
          <input
            className={clsInput(showErrors, errs.line1)}
            value={billing.line1 || ""}
            onChange={on("line1")}
            aria-invalid={showErrors && errs.line1 ? true : undefined}
            aria-describedby="err-bill-line1"
          />
          <InlineError
            show={showErrors && errs.line1}
            id="err-bill-line1"
            text={fieldErrorText("line1")}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            Address Line 2 (optional)
          </label>
          <input
            className={baseInput + " border-neutral-300"}
            value={billing.line2 || ""}
            onChange={on("line2")}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            City <RequiredStar />
          </label>
          <input
            className={clsInput(showErrors, errs.city)}
            value={billing.city || ""}
            onChange={on("city")}
            aria-invalid={showErrors && errs.city ? true : undefined}
            aria-describedby="err-bill-city"
          />
          <InlineError
            show={showErrors && errs.city}
            id="err-bill-city"
            text={fieldErrorText("city")}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            State/Region <RequiredStar />
          </label>
          <input
            className={clsInput(showErrors, errs.state)}
            value={billing.state || ""}
            onChange={on("state")}
            aria-invalid={showErrors && errs.state ? true : undefined}
            aria-describedby="err-bill-state"
          />
          <InlineError
            show={showErrors && errs.state}
            id="err-bill-state"
            text={fieldErrorText("state")}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            Postcode <RequiredStar />
          </label>
          <input
            className={clsInput(showErrors, errs.postcode)}
            value={billing.postcode || ""}
            onChange={on("postcode")}
            aria-invalid={showErrors && errs.postcode ? true : undefined}
            aria-describedby="err-bill-postcode"
          />
          <InlineError
            show={showErrors && errs.postcode}
            id="err-bill-postcode"
            text={fieldErrorText("postcode")}
          />
        </div>

        {/* Billing Country (Reusable Component) */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">
            Country <RequiredStar />
          </label>

          <CountrySelect
            value={billing.country || ""}
            onChange={(code) => {
              setBilling({ ...billing, country: code });
              if (showErrors) onFieldChange?.("country", code);
            }}
            invalid={!!(showErrors && errs.country)}
            describedById="err-bill-country"
            placeholder="Select country"
          />

          <InlineError
            show={showErrors && errs.country}
            id="err-bill-country"
            text={fieldErrorText("country")}
          />
        </div>
      </div>
    </div>
  );

  if (variant === "bare") return <>{Inner}</>;

  return (
    <section className="rounded-xl border" id="billing-section">
      <div className="border-b px-4 py-3 font-semibold">{title}</div>
      {Inner}
    </section>
  );
}

/* ---------------- AddressStep 主组件 ---------------- */
const AddressStep: React.FC<AddressStepProps> = ({
  isLoggedIn,
  accountEmail,

  address,
  setAddress,

  billingAddress,
  setBillingAddress,

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
                />
              </div>
            )}

            {isLoggedIn && !(useSavedDelivery && useSavedBilling) && (
              <div className="flex justify-end -mt-2 mr-6">
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={onSaveDefault}
                    className="rounded-full border bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
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
