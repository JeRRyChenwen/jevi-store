// src/app/(shop)/checkout/shipping-quote-actions.ts

import {
  buildQuoteRequestInput,
  fetchOneQuote,
  getShippingQuoteDisplayMessage,
  isShippingQuoteBlockingError,
  type ShippingQuoteAPIResult,
} from "./shipping-quote";
import type { DeliveryMethod } from "./types";

export async function fetchShippingQuotesBothHelper(args: {
  hasItems: boolean;
  address: {
    country?: string | null;
    state?: string | null;
    postcode?: string | null;
  } | null | undefined;
  itemsMinor: number;
  deliveryMethod: DeliveryMethod;

  remoteBase: string;
  apiURL: (path: string) => string;

  abortRef: { current: AbortController | null };

  setQuoteLoading: (value: boolean) => void;
  setQuoteError: (value: string | null) => void;
  setQuoteByMethod: (
    value: Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>>
  ) => void;
  setLastQuoteMeta: (value: any | null) => void;
}) {
  if (!args.hasItems) {
    args.setQuoteByMethod({});
    args.setLastQuoteMeta(null);
    args.setQuoteError(null);
    return;
  }

  const quoteInput = buildQuoteRequestInput({
    country: args.address?.country,
    state: args.address?.state,
    postcode: args.address?.postcode,
    itemsMinor: args.itemsMinor,
  });

  args.setQuoteLoading(true);
  args.setQuoteError(null);

  try {
    args.abortRef.current?.abort();
  } catch {}

  const ac = new AbortController();
  args.abortRef.current = ac;

  try {
    const [qStandard, qExpress] = await Promise.all([
      fetchOneQuote({
        remoteBase: args.remoteBase,
        apiURL: args.apiURL,
        delivery_option: "standard",
        country: quoteInput.country,
        state: quoteInput.state,
        postcode: quoteInput.postcode,
        items_total_minor: quoteInput.items_total_minor,
        signal: ac.signal,
      }),
      fetchOneQuote({
        remoteBase: args.remoteBase,
        apiURL: args.apiURL,
        delivery_option: "express",
        country: quoteInput.country,
        state: quoteInput.state,
        postcode: quoteInput.postcode,
        items_total_minor: quoteInput.items_total_minor,
        signal: ac.signal,
      }),
    ]);

    const next: Partial<Record<DeliveryMethod, ShippingQuoteAPIResult>> = {
      standard: qStandard,
      express: qExpress,
    };

    args.setQuoteByMethod(next);
    args.setLastQuoteMeta(args.deliveryMethod === "express" ? qExpress : qStandard);

    const failedQuotes = [qStandard, qExpress].filter((q) => !q.ok);
    const blockingQuote = failedQuotes.find((q) =>
      isShippingQuoteBlockingError(q.error),
    );

    if (blockingQuote) {
      args.setQuoteError(getShippingQuoteDisplayMessage(blockingQuote));
    } else if (failedQuotes.length > 0) {
      const msg = failedQuotes
        .map((q) => getShippingQuoteDisplayMessage(q))
        .filter(Boolean)
        .join(" | ");

      args.setQuoteError(msg || "Shipping quote unavailable.");
    } else {
      args.setQuoteError(null);
    }
  } catch (e: any) {
    if (String(e?.name) === "AbortError") return;

    args.setQuoteError(String(e?.message || e || "quote_failed"));
    args.setQuoteByMethod({});
    args.setLastQuoteMeta(null);
  } finally {
    args.setQuoteLoading(false);
  }
}