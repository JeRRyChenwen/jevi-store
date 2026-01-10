// src/app/checkout/_components/AddressStep.tsx
"use client";

import React from "react";
import AddressErrorHint from "./AddressErrorHint";

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
  country?: string;
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
  errorBanner,
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
  errorBanner?: string | null;
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

  const baseInput =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10";
  const cls = (bad: boolean) =>
    showErrors && bad ? `${baseInput} border-red-500` : `${baseInput} border-neutral-300`;

  const Inner = (
    <div className="p-4 space-y-6">
      {/* 顶部统一错误提示（可选） */}
      {errorBanner && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorBanner}
        </div>
      )}

      {/* 表单主体 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="addr-first" className="block text-sm font-medium text-neutral-700">
            First Name
          </label>
          <input
            id="addr-first"
            className={cls(errs.firstName)}
            autoComplete="given-name"
            value={address.firstName || ""}
            onChange={on("firstName")}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="addr-last" className="block text-sm font-medium text-neutral-700">
            Last Name
          </label>
          <input
            id="addr-last"
            className={cls(errs.lastName)}
            autoComplete="family-name"
            value={address.lastName || ""}
            onChange={on("lastName")}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label htmlFor="addr-phone" className="block text-sm font-medium text-neutral-700">
            Phone
          </label>
          <input
            id="addr-phone"
            className={cls(errs.phone)}
            autoComplete="tel"
            value={address.phone || ""}
            onChange={on("phone")}
          />
        </div>

        <div className="md:col-span-2 space-y-1">
          <label htmlFor="addr-line1" className="block text-sm font-medium text-neutral-700">
            Address Line 1
          </label>
          <input
            id="addr-line1"
            className={cls(errs.line1)}
            autoComplete="address-line1"
            value={address.line1 || ""}
            onChange={on("line1")}
          />
        </div>

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

        <div className="space-y-1">
          <label htmlFor="addr-city" className="block text-sm font-medium text-neutral-700">
            City
          </label>
          <input
            id="addr-city"
            className={cls(errs.city)}
            autoComplete="address-level2"
            value={address.city || ""}
            onChange={on("city")}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="addr-state" className="block text-sm font-medium text-neutral-700">
            State/Region
          </label>
          <input
            id="addr-state"
            className={cls(errs.state)}
            autoComplete="address-level1"
            value={address.state || ""}
            onChange={on("state")}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="addr-postcode" className="block text-sm font-medium text-neutral-700">
            Postcode
          </label>
          <input
            id="addr-postcode"
            className={cls(errs.postcode)}
            autoComplete="postal-code"
            value={address.postcode || ""}
            onChange={on("postcode")}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="addr-country" className="block text-sm font-medium text-neutral-700">
            Country
          </label>
          <input
            id="addr-country"
            className={cls(errs.country)}
            autoComplete="country-name"
            value={address.country || ""}
            onChange={on("country")}
          />
        </div>
      </div>

      {/* 未登录才显示 Your Details */}
      {!hideYourDetails && (
        <div className="border rounded-lg p-4">
          <h3 className="text-base font-medium mb-2">Your Details</h3>
          <p className="text-sm text-neutral-600 mb-3">
            Please enter your email address, we'll send your order confirmation here
          </p>

          <label htmlFor="addr-email" className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            id="addr-email"
            type="email"
            className={cls(errs.email)}
            autoComplete="email"
            value={emailInput}
            onChange={(e) => {
              const v = e.currentTarget.value;
              setEmailInput(v);
              setAddress({ ...address, email: v });
            }}
            onBlur={(e) => onEmailCommit?.(e.currentTarget.value)}
          />

          <p className="mt-1 text-xs text-neutral-500">
            You can create an account after checkout
          </p>

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
    <section className="rounded-xl border" id="address-section">
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
  const baseInput =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10";
  const cls = (bad: boolean) =>
    showErrors && bad ? `${baseInput} border-red-500` : `${baseInput} border-neutral-300`;

  const on =
    (k: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setBilling({ ...billing, [k]: v });
      if (showErrors) onFieldChange?.(k, v);
    };

  const Inner = (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">First Name</label>
          <input
            className={cls(errs.firstName)}
            value={billing.firstName || ""}
            onChange={on("firstName")}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">Last Name</label>
          <input
            className={cls(errs.lastName)}
            value={billing.lastName || ""}
            onChange={on("lastName")}
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-neutral-700">Phone</label>
          <input
            className={cls(errs.phone)}
            value={billing.phone || ""}
            onChange={on("phone")}
          />
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-neutral-700">Address Line 1</label>
          <input
            className={cls(errs.line1)}
            value={billing.line1 || ""}
            onChange={on("line1")}
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
          <label className="block text-sm font-medium text-neutral-700">City</label>
          <input
            className={cls(errs.city)}
            value={billing.city || ""}
            onChange={on("city")}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">State/Region</label>
          <input
            className={cls(errs.state)}
            value={billing.state || ""}
            onChange={on("state")}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">Postcode</label>
          <input
            className={cls(errs.postcode)}
            value={billing.postcode || ""}
            onChange={on("postcode")}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700">Country</label>
          <input
            className={cls(errs.country)}
            value={billing.country || ""}
            onChange={on("country")}
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
  // ✅ 防呆：有时 page.tsx 可能没把 hasSavedDelivery/hasSavedBilling 算对
  // 只要 savedDeliveryAddr / savedBillingAddr 实际存在，就认为有 saved address
  const effectiveHasSavedDelivery = hasSavedDelivery || !!savedDeliveryAddr;
  const effectiveHasSavedBilling = hasSavedBilling || !!savedBillingAddr;

  return (
    <>
      {/* 顶部：Use Saved Addresses 区块 */}
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
                      setUseSavedDelivery(checked);

                      // 勾选时把 saved delivery 写入当前 address
                      if (checked && savedDeliveryAddr) {
                        setAddress(savedDeliveryAddr);
                        clearAddressErrors();
                      }
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
                      setUseSavedBilling(checked);

                      // 勾选时把 saved billing 写入当前 billingAddress
                      if (checked && savedBillingAddr) {
                        setBillingAddress(savedBillingAddr);
                        clearBillingErrors();
                      }
                    }}
                  />
                  Use saved <strong>Billing Address</strong>
                </label>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 与上方区块留一点空间 */}
      <div className="h-4" />

      {/* 当两边都用 saved 地址时，整体 Address & Billing 区块可隐藏 */}
      {!(useSavedDelivery && useSavedBilling) && (
        <section className="rounded-xl border pb-8" id="address-section">
          <div className="border-b px-4 py-3 font-semibold">Address & Billing</div>

          <div className="p-4 space-y-6">
            {/* 1) Delivery Address（未勾选 Use saved Delivery 时才显示） */}
            {!useSavedDelivery && (
              <div className="space-y-2">
                <h3 className="text-base font-medium">Delivery Address</h3>
                <AddressForm
                  address={address}
                  setAddress={setAddress}
                  emailInput={emailInput}
                  setEmailInput={setEmailInput}
                  marketingOptIn={marketingOptIn}
                  setMarketingOptIn={setMarketingOptIn}
                  showErrors={addressShowErrors}
                  errs={addressErrs}
                  errorBanner={
                    addressShowErrors ? "Some required fields are missing or invalid." : null
                  }
                  onEmailCommit={(email) => sendSubscriptionIfNeeded(email)}
                  onOptInChanged={() => sendSubscriptionIfNeeded()}
                  hideYourDetails={isLoggedIn}
                  variant="bare"
                />
              </div>
            )}

            {/* 2) Billing 同收货地址开关（没用 saved billing 时才有意义） */}
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

            {/* 3) Billing Address（不同于 delivery 且未勾选 saved billing 时） */}
            {!sameAsDelivery && !useSavedBilling && (
              <div className="space-y-2">
                <h3 className="text-base font-medium">Billing Address</h3>
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

            {/* 4) Save as default 按钮（至少一侧为可编辑时） */}
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

                  {saveMsg &&
                    (saveMsg.kind === "success" ? (
                      <div className="mt-1 text-xs text-emerald-700" aria-live="polite">
                        {saveMsg.text}
                      </div>
                    ) : (
                      <AddressErrorHint className="mt-1">{saveMsg.text}</AddressErrorHint>
                    ))}
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
