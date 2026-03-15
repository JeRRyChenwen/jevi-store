// src/app/(shop)/checkout/_components/BillingForm.tsx
"use client";

import React from "react";
import CountrySelect from "@/components/address/CountrySelect";

import type { Address, AddressErr } from "./address-step.types";
import { baseInput, hasAnyErr, fieldErrorText, clsInput } from "./address-step.utils";
import { InlineError, RequiredStar } from "./AddressFieldParts";

type BillingFormProps = {
  billing: Address;
  setBilling: (a: Address) => void;
  showErrors: boolean;
  errs: AddressErr;
  onFieldChange?: (k: keyof Address, v: string) => void;
  variant?: "section" | "bare";
  title?: string;
};

export default function BillingForm({
  billing,
  setBilling,
  showErrors,
  errs,
  onFieldChange,
  variant = "section",
  title = "Billing Address",
}: BillingFormProps) {
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