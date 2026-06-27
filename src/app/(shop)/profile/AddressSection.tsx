// src/app/(shop)/profile/AddressSection.tsx
"use client";

import { useEffect, useMemo } from "react";
import { Alert } from "@/components/ui/alert";
import { FieldMessage } from "@/components/ui/field-message";
import CountrySelect from "@/components/address/CountrySelect";
import {
  AU_STATE_OPTIONS,
  isAustraliaCountry,
  normalizeStateForCountry,
} from "@/lib/address/auStates";
import type { Address, FieldErrors } from "./edit-address-card.types";
import { countryLabelOf } from "@/lib/country";

import {
  baseInputClass,
  readOnlyClass,
  errorClass,
  normalizeAddressForUI,
  alertVariantOf,
} from "./edit-address-card.utils";

function buildEmptyAddressForStorefront(defaultCountry: string): Address {
  return {
    first_name: "",
    last_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postcode: "",
    country: String(defaultCountry || "")
      .trim()
      .toUpperCase(),
    is_default: false,
  };
}

type FormAlertLike = {
  hasAlert: boolean;
  alert?: { type?: string; message?: string } | null;
  clear: () => void;
};

type AddressSectionProps = {
  title: string;
  address: Address;
  setAddress: React.Dispatch<React.SetStateAction<Address>>;
  editing: boolean;
  setEditing: (v: boolean) => void;
  saving: boolean;
  errors: FieldErrors;
  setErrors: React.Dispatch<React.SetStateAction<FieldErrors>>;
  onSave: () => void;
  alert: FormAlertLike;
  allowedCountries: string[];
  defaultCountry: string;
};

export default function AddressSection({
  title,
  address,
  setAddress,
  editing,
  setEditing,
  saving,
  errors,
  setErrors,
  onSave,
  alert,
  allowedCountries,
  defaultCountry,
}: AddressSectionProps) {
  const lowerTitle = title.toLowerCase();

  const countryOptions = useMemo(
    () =>
      allowedCountries.map((code) => {
        const upper = String(code || "")
          .trim()
          .toUpperCase();
        return {
          code: upper,
          label: countryLabelOf(upper) || upper,
        };
      }),
    [allowedCountries],
  );

  const isAuAddress = isAustraliaCountry(address.country || defaultCountry);
  const stateValue = isAuAddress
    ? normalizeStateForCountry(address.state, address.country || defaultCountry)
    : String(address.state || "");

  useEffect(() => {
    const allowedSet = new Set(
      allowedCountries
        .map((x) =>
          String(x || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    );

    const current = String(address.country || "")
      .trim()
      .toUpperCase();

    if (!current || !allowedSet.has(current)) {
      setAddress((prev) => {
        const prevIsDefault = !!prev?.is_default;

        return {
          ...buildEmptyAddressForStorefront(defaultCountry),
          is_default: prevIsDefault,
        };
      });

      setErrors({});
      alert.clear();
    }
  }, [
    address.country,
    allowedCountries,
    defaultCountry,
    setAddress,
    setErrors,
    alert,
  ]);

  return (
    <section className="rounded-lg border bg-white">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{lowerTitle}</span>
          {address.is_default && (
            <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
              Default
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-500">
              First name<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editing}
              value={address.first_name || ""}
              onChange={(e) => {
                const v = e.target.value;
                setAddress((prev) => ({ ...prev, first_name: v }));
                setErrors((prev) => ({ ...prev, first_name: undefined }));
                alert.clear();
              }}
              className={
                baseInputClass +
                (!editing ? readOnlyClass : "") +
                (errors.first_name ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{errors.first_name}</FieldMessage>
          </div>

          <div>
            <label className="text-xs text-neutral-500">
              Last name<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editing}
              value={address.last_name || ""}
              onChange={(e) => {
                const v = e.target.value;
                setAddress((prev) => ({ ...prev, last_name: v }));
                setErrors((prev) => ({ ...prev, last_name: undefined }));
                alert.clear();
              }}
              className={
                baseInputClass +
                (!editing ? readOnlyClass : "") +
                (errors.last_name ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{errors.last_name}</FieldMessage>
          </div>
        </div>

        <div>
          <label className="text-xs text-neutral-500">
            Phone<span className="text-red-500">*</span>
          </label>
          <input
            disabled={!editing}
            value={address.phone || ""}
            onChange={(e) => {
              const v = e.target.value;
              setAddress((prev) => ({ ...prev, phone: v }));
              setErrors((prev) => ({ ...prev, phone: undefined }));
              alert.clear();
            }}
            className={
              baseInputClass +
              (!editing ? readOnlyClass : "") +
              (errors.phone ? errorClass : "")
            }
          />
          <FieldMessage variant="error">{errors.phone}</FieldMessage>
        </div>

        <div>
          <label className="text-xs text-neutral-500">
            Address line 1<span className="text-red-500">*</span>
          </label>
          <input
            disabled={!editing}
            value={address.line1 || ""}
            onChange={(e) => {
              const v = e.target.value;
              setAddress((prev) => ({ ...prev, line1: v }));
              setErrors((prev) => ({ ...prev, line1: undefined }));
              alert.clear();
            }}
            className={
              baseInputClass +
              (!editing ? readOnlyClass : "") +
              (errors.line1 ? errorClass : "")
            }
          />
          <FieldMessage variant="error">{errors.line1}</FieldMessage>
        </div>

        <div>
          <label className="text-xs text-neutral-500">
            Address line 2 (optional)
          </label>
          <input
            disabled={!editing}
            value={address.line2 || ""}
            onChange={(e) => {
              const v = e.target.value;
              setAddress((prev) => ({ ...prev, line2: v }));
              alert.clear();
            }}
            className={baseInputClass + (!editing ? readOnlyClass : "")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-500">
              City<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editing}
              value={address.city || ""}
              onChange={(e) => {
                const v = e.target.value;
                setAddress((prev) => ({ ...prev, city: v }));
                setErrors((prev) => ({ ...prev, city: undefined }));
                alert.clear();
              }}
              className={
                baseInputClass +
                (!editing ? readOnlyClass : "") +
                (errors.city ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{errors.city}</FieldMessage>
          </div>

          <div>
            <label className="text-xs text-neutral-500">
              State/Region<span className="text-red-500">*</span>
            </label>

            {isAuAddress ? (
              <select
                disabled={!editing}
                value={stateValue}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddress((prev) => ({ ...prev, state: v }));
                  setErrors((prev) => ({ ...prev, state: undefined }));
                  alert.clear();
                }}
                className={
                  baseInputClass +
                  (!editing ? readOnlyClass : "") +
                  (errors.state ? errorClass : "")
                }
              >
                <option value="">Select state/region</option>
                {AU_STATE_OPTIONS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                disabled={!editing}
                value={address.state || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddress((prev) => ({ ...prev, state: v }));
                  setErrors((prev) => ({ ...prev, state: undefined }));
                  alert.clear();
                }}
                className={
                  baseInputClass +
                  (!editing ? readOnlyClass : "") +
                  (errors.state ? errorClass : "")
                }
              />
            )}

            <FieldMessage variant="error">{errors.state}</FieldMessage>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-neutral-500">
              Postcode<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editing}
              value={address.postcode || ""}
              onChange={(e) => {
                const v = e.target.value;
                setAddress((prev) => ({ ...prev, postcode: v }));
                setErrors((prev) => ({ ...prev, postcode: undefined }));
                alert.clear();
              }}
              className={
                baseInputClass +
                (!editing ? readOnlyClass : "") +
                (errors.postcode ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{errors.postcode}</FieldMessage>
          </div>

          <div>
            <label className="text-xs text-neutral-500">
              Country<span className="text-red-500">*</span>
            </label>

            <div className="mt-1">
              <CountrySelect
                value={address.country}
                disabled={!editing}
                invalid={!!errors.country}
                options={countryOptions}
                onChange={(code) => {
                  setAddress((prev) => {
                    const nextState = isAustraliaCountry(code)
                      ? normalizeStateForCountry(prev.state, code)
                      : String(prev.state || "");

                    return {
                      ...prev,
                      country: code,
                      state: nextState,
                    };
                  });

                  setErrors((prev) => ({
                    ...prev,
                    country: undefined,
                    state: undefined,
                  }));

                  alert.clear();
                }}
              />
            </div>

            <FieldMessage variant="error">{errors.country}</FieldMessage>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {!editing ? (
            <button
              type="button"
              onClick={() => {
                const allowedSet = new Set(
                  allowedCountries
                    .map((x) =>
                      String(x || "")
                        .trim()
                        .toUpperCase(),
                    )
                    .filter(Boolean),
                );

                setAddress((prev) => {
                  const next = normalizeAddressForUI(prev);
                  const current = String(next.country || "")
                    .trim()
                    .toUpperCase();

                  if (current && allowedSet.has(current)) {
                    return next;
                  }

                  return {
                    ...buildEmptyAddressForStorefront(defaultCountry),
                    is_default: !!prev?.is_default,
                  };
                });

                setEditing(true);
                setErrors({});
                alert.clear();
              }}
              className="min-w-[96px] rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setErrors({});
                  alert.clear();
                  location.reload();
                }}
                className="min-w-[96px] rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onSave}
                className="min-w-[96px] rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>

        {alert.hasAlert && alert.alert?.message ? (
          <Alert variant={alertVariantOf(alert.alert.type)}>
            {alert.alert.message}
          </Alert>
        ) : null}
      </div>
    </section>
  );
}
