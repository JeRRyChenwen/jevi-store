// src/app/(shop)/checkout/_components/AddressForm.tsx
"use client";

import React from "react";
import CountrySelect from "@/components/address/CountrySelect";
import type { Address, AddressErr } from "./address-step.types";
import { baseInput, hasAnyErr, fieldErrorText, clsInput } from "./address-step.utils";
import { InlineError, RequiredStar } from "./AddressFieldParts";


/** ✅ 当前 checkout 只允许 AU / NZ 收货 */
const CHECKOUT_COUNTRY_OPTIONS = [
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
] as const;

type AddressFormProps = {
  address: Address;
  setAddress: (a: Address) => void;
  marketingOptIn: boolean;
  setMarketingOptIn: (v: boolean) => void;
  showErrors: boolean;
  errs: AddressErr;
  onEmailCommit?: (email: string) => void;
  onOptInChanged?: (opt: boolean) => void;
  hideYourDetails?: boolean;
  accountEmail?: string;
  variant?: "section" | "bare";
  title?: string;
};

export default function AddressForm({
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
}: AddressFormProps) {
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
            options={CHECKOUT_COUNTRY_OPTIONS}
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