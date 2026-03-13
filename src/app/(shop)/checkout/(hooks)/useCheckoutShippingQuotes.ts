"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DeliveryMethod } from "../types";
import type { ShippingQuoteAPIResult } from "../shipping-quote";
import {
  getCheckoutCartHash,
  getCheckoutQuoteReqKey,
} from "../checkout-derived-state";
import { fetchCheckoutShippingQuotesBoth } from "../checkout-shipping-request";

type UseCheckoutShippingQuotesParams = {
  hasItems: boolean;
  cart: any[];
  itemsMinor: number;
  address: {
    country?: string | null;
    state?: string | null;
    postcode?: string | null;
  } | null | undefined;
  deliveryMethod: DeliveryMethod;
  remoteBase: string;
  apiURL: (path: string) => string;
};

export function useCheckoutShippingQuotes({
  hasItems,
  cart,
  itemsMinor,
  address,
  deliveryMethod,
  remoteBase,
  apiURL,
}: UseCheckoutShippingQuotesParams) {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [quoteByMethod, setQuoteByMethod] = useState<
    Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>>
  >({});
  const [lastQuoteMeta, setLastQuoteMeta] = useState<any | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const quoteReqKey = useMemo(() => {
    return getCheckoutQuoteReqKey({
      hasItems,
      itemsMinor,
      country: address?.country,
      state: address?.state,
      postcode: address?.postcode,
    });
  }, [address?.country, address?.postcode, address?.state, hasItems, itemsMinor]);

  const cartHash = useMemo(() => {
    return getCheckoutCartHash({
      hasItems,
      cart,
    });
  }, [cart, hasItems]);

  async function fetchQuotesBoth() {
    await fetchCheckoutShippingQuotesBoth({
      hasItems,
      address,
      itemsMinor,
      deliveryMethod,
      remoteBase,
      apiURL,
      abortRef,
      setQuoteLoading,
      setQuoteError,
      setQuoteByMethod,
      setLastQuoteMeta,
    });
  }

  useEffect(() => {
    void fetchQuotesBoth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteReqKey]);

  return {
    quoteLoading,
    quoteError,
    quoteByMethod,
    lastQuoteMeta,
    cartHash,
  };
}