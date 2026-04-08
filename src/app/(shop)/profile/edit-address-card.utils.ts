// src/app/profile/edit-address-card.utils.ts

import type { Address, FieldErrors } from "./edit-address-card.types";
import { CURRENT_STOREFRONT } from "@/lib/market/current";

export const DEFAULT_COUNTRY_FALLBACK = CURRENT_STOREFRONT.primaryCountry;

export const EMPTY_ADDRESS: Address = {
  first_name: "",
  last_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
};

export const baseInputClass =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10";

export const readOnlyClass = " bg-neutral-50";
export const errorClass = " border-red-400";

export function normalizeCountry(v: any, defaultCountry = DEFAULT_COUNTRY_FALLBACK): string {
  const s = String(v ?? "").trim().toUpperCase();
  return s || String(defaultCountry || DEFAULT_COUNTRY_FALLBACK).trim().toUpperCase();
}

export function normalizeAddressForUI(
  raw: Address,
  defaultCountry = DEFAULT_COUNTRY_FALLBACK
): Address {
  return {
    ...raw,
    country: normalizeCountry(raw.country, defaultCountry),
  };
}

export function shapeAddress(
  raw: any | null,
  defaultCountry = DEFAULT_COUNTRY_FALLBACK
): Address {
  if (!raw) return normalizeAddressForUI({ ...EMPTY_ADDRESS }, defaultCountry);

  const shaped: Address = {
    first_name: raw.first_name || "",
    last_name: raw.last_name || "",
    phone: raw.phone || "",
    line1: raw.line1 || "",
    line2: raw.line2 || "",
    city: raw.city || "",
    state: raw.state || "",
    postcode: raw.postcode || "",
    country: raw.country || "",
    is_default: raw.is_default != null ? !!raw.is_default : raw.type ? true : null,
  };

  return normalizeAddressForUI(shaped, defaultCountry);
}

export function validateAddress(
  addr: Address,
  kind: "delivery" | "billing",
  allowedCountries?: string[]
): { ok: boolean; errors: FieldErrors; message: string } {
  const required: (keyof Address)[] = [
    "first_name",
    "last_name",
    "phone",
    "line1",
    "city",
    "state",
    "postcode",
    "country",
  ];

  const errors: FieldErrors = {};
  for (const key of required) {
    const v = (addr[key] ?? "").toString().trim();
    if (!v) errors[key] = "Required";
  }

  const allowedSet = new Set(
    (allowedCountries || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean)
  );

  const country = String(addr.country || "").trim().toUpperCase();
  if (country && allowedSet.size > 0 && !allowedSet.has(country)) {
    errors.country = CURRENT_STOREFRONT.shippingCountryErrorMessage;
  }

  const ok = Object.keys(errors).length === 0;
  const message = ok ? "" : `Please complete all required ${kind} address fields before saving.`;
  return { ok, errors, message };
}

export function alertVariantOf(type?: string): "error" | "success" | "warning" | "info" {
  if (type === "success") return "success";
  if (type === "warning") return "warning";
  if (type === "info") return "info";
  return "error";
}