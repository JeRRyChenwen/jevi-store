// src/app/(shop)/checkout/_components/usePaymentDerivedState.ts
"use client";

import { useMemo } from "react";
import { buildCartHash, buildStockItems } from "./PaymentStep.helpers";
import { countryLabelOf } from "@/lib/country";

type Params = {
  cart: any[];
  currency?: string | null;
  deliveryFeeMinor?: number | null;
  isLoggedIn: boolean;
  accountEmail?: string | null;
  address?: {
    firstName?: string | null;
    lastName?: string | null;
    line1?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    email?: string | null;
    country?: string | null;
  } | null;
};

export function usePaymentDerivedState({
  cart,
  currency,
  deliveryFeeMinor,
  isLoggedIn,
  accountEmail,
  address,
}: Params) {
  const safeCurrency = useMemo(() => {
    return String(currency || cart?.[0]?.currency || "")
      .trim()
      .toUpperCase() || "AUD";
  }, [currency, cart]);

  const stockItems = useMemo(() => buildStockItems(cart as any[]), [cart]);

  const cartHash = useMemo(() => buildCartHash(stockItems), [stockItems]);

  const derivedItemsCount = useMemo(() => {
    const list = Array.isArray(cart) ? cart : [];
    return list.reduce((sum, it) => sum + Math.max(1, Number(it?.qty) || 1), 0);
  }, [cart]);

  const derivedItemsMinor = useMemo(() => {
    const list = Array.isArray(cart) ? cart : [];
    return list.reduce((sum, it) => {
      const qty = Math.max(1, Number(it?.qty) || 1);
      const priceMajor = Number(it?.price) || 0;
      const unitMinor = Math.round(priceMajor * 100);
      const lineMinor = unitMinor * qty;
      return sum + Math.max(0, lineMinor);
    }, 0);
  }, [cart]);

  const derivedTotalMinor = useMemo(() => {
    return Math.max(0, derivedItemsMinor + (Number(deliveryFeeMinor) || 0));
  }, [derivedItemsMinor, deliveryFeeMinor]);

  const derivedAmountMajor = useMemo(() => {
    return Number((derivedTotalMinor / 100).toFixed(2));
  }, [derivedTotalMinor]);

  const hasAddress =
    address?.firstName ||
    address?.lastName ||
    address?.line1 ||
    address?.city ||
    address?.state ||
    address?.postcode;

  const effectiveOrderEmail = useMemo(() => {
    return isLoggedIn
      ? String(accountEmail || "").trim()
      : String(address?.email || "").trim();
  }, [isLoggedIn, accountEmail, address?.email]);

  const countryDisplay = useMemo(() => {
    const raw = (address?.country || "").trim();
    if (!raw) return "";
    const label = countryLabelOf(raw);
    return label || raw;
  }, [address?.country]);

  return {
    safeCurrency,
    stockItems,
    cartHash,
    derivedItemsCount,
    derivedItemsMinor,
    derivedTotalMinor,
    derivedAmountMajor,
    hasAddress: !!hasAddress,
    effectiveOrderEmail,
    countryDisplay,
  };
}