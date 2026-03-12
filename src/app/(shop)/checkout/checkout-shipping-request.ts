// src/app/(shop)/checkout/checkout-shipping-request.ts
import type { DeliveryMethod } from "./types";
import { fetchShippingQuotesBothHelper } from "./shipping-quote-actions";

type Params = {
  hasItems: boolean;
  address: any;
  itemsMinor: number;
  deliveryMethod: DeliveryMethod;
  remoteBase: string;
  apiURL: (path: string) => string;
  abortRef: React.MutableRefObject<AbortController | null>;
  setQuoteLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setQuoteError: React.Dispatch<React.SetStateAction<string | null>>;
  setQuoteByMethod: React.Dispatch<React.SetStateAction<any>>;
  setLastQuoteMeta: React.Dispatch<React.SetStateAction<any | null>>;
};

export async function fetchCheckoutShippingQuotesBoth({
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
}: Params) {
  await fetchShippingQuotesBothHelper({
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