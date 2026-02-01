// src/app/checkout/_components/AddressStep.tsx
"use client";

import React, { useMemo, useRef } from "react";
import AddressErrorHint from "./AddressErrorHint";
import { Alert } from "@/components/ui/alert";
import CountrySelect from "@/components/address/CountrySelect";

/* ====== 本组件内部使用的类型（结构要和 page.tsx 里的一样） ====== */
type Address = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string; // 现在存的是 ISO code，比如 "AU"
};

type AddressErr = {
  firstName: boolean;
  lastName: boolean;
  phone: boolean;
  line1: boolean;
  city: boolean;
  state: boolean;
  postcode: boolean;
  country: boolean;
  email: boolean;
};

type SaveMsg = { kind: "error" | "success"; text: string } | null;

/* ====== Props：由 page.tsx 传入 ====== */
type AddressStepProps = {
  isLoggedIn: boolean;

  address: Address;
  setAddress: (a: Address) => void;

  billingAddress: Address;
  setBillingAddress: (a: Address) => void;

  sameAsDelivery: boolean;
  setSameAsDelivery: (v: boolean) => void;

  hasSavedDelivery: boolean;
  hasSavedBilling: boolean;
  savedDeliveryAddr: Address | null;
  savedBillingAddr: Address | null;
  useSavedDelivery: boolean;
  setUseSavedDelivery: (v: boolean) => void;
  useSavedBilling: boolean;
  setUseSavedBilling: (v: boolean) => void;

  addressShowErrors: boolean;
  addressErrs: AddressErr;
  billingErrs: AddressErr;
  handleBillingFieldChange: (k: keyof Address, v: string) => void;

  // 从外面控制清理错误
  clearAddressErrors: () => void;
  clearBillingErrors: () => void;

  saveMsg: SaveMsg;
  onSaveDefault: () => void;

  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  sendSubscriptionIfNeeded: (emailRaw?: string) => void | Promise<void>;
};

/* ---------------- 小工具 ---------------- */
const baseInput =
  "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10";

function hasAnyErr(errs: AddressErr, includeEmail: boolean) {
  const keys: (keyof AddressErr)[] = includeEmail
    ? [
        "firstName",
        "lastName",
        "phone",
        "line1",
        "city",
        "state",
        "postcode",
        "country",
        "email",
      ]
    : ["firstName", "lastName", "phone", "line1", "city", "state", "postcode", "country"];
  return keys.some((k) => !!errs[k]);
}

function fieldErrorText(key: keyof AddressErr): string {
  if (key === "email") return "Please enter a valid email address.";
  if (key === "phone") return "Please enter a valid phone number.";
  if (key === "postcode") return "Please enter a valid postcode.";
  return "This field is required.";
}

function clsInput(showErrors: boolean, bad: boolean) {
  return showErrors && bad ? `${baseInput} border-red-500` : `${baseInput} border-neutral-300`;
}

function InlineError({
  show,
  id,
  text,
}: {
  show: boolean;
  id: string;
  text: string;
}) {
  if (!show) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600">
      {text}
    </p>
  );
}

function RequiredStar() {
  return <span className="ml-1 text-red-600">*</span>;
}

/* ---------------- Address 表单（UI） ---------------- */
function AddressForm({
  address,
  setAddress,
  emailInput,
  setEmailInput,
  marketingOptIn,
  setMarketingOptIn,
  showErrors,
  errs,
  onEmailCommit,
  onOptInChanged,
  hideYourDetails = false,
  variant = "section",
  title = "Address",
}: {
  address: Address;
  setAddress: (a: Address) => void;
  emailInput: string;
  setEmailInput: (v: string) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
  showErrors: boolean;
  errs: AddressErr;
  onEmailCommit?: (email: string) => void;
  onOptInChanged?: (opt: boolean) => void;
  hideYourDetails?: boolean;
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

      {!hideYourDetails && (
        <div className="border rounded-lg p-4">
          <h3 className="text-base font-medium mb-2">Your Details</h3>
          <p className="text-sm text-neutral-600 mb-3">
            Please enter your email address, we&apos;ll send your order confirmation here.
          </p>

          <label htmlFor="addr-email" className="block text-sm font-medium mb-1">
            Email Address <RequiredStar />
          </label>
          <input
            id="addr-email"
            type="email"
            className={clsInput(showErrors, errs.email)}
            autoComplete="email"
            value={emailInput}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setEmailInput(v);
              setAddress({ ...address, email: v });
            }}
            onBlur={(e) => onEmailCommit?.(e.currentTarget.value)}
            aria-invalid={showErrors && errs.email ? true : undefined}
            aria-describedby="err-addr-email"
          />
          <InlineError
            show={showErrors && errs.email}
            id="err-addr-email"
            text={fieldErrorText("email")}
          />

          <p className="mt-1 text-xs text-neutral-500">You can create an account after checkout.</p>

          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={marketingOptIn}
              onChange={(e) => {
                const v = e.currentTarget.checked;
                setMarketingOptIn(v);
                onOptInChanged?.(v);
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
        </div>
      )}
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
  emailInput,
  setEmailInput,
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
                  emailInput={emailInput}
                  setEmailInput={setEmailInput}
                  marketingOptIn={marketingOptIn}
                  setMarketingOptIn={setMarketingOptIn}
                  showErrors={addressShowErrors}
                  errs={addressErrs}
                  onEmailCommit={(email) => sendSubscriptionIfNeeded(email)}
                  onOptInChanged={() => sendSubscriptionIfNeeded()}
                  hideYourDetails={isLoggedIn}
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
