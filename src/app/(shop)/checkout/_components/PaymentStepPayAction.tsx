"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PayPalBigButton from "./PayPalBigButton";
import type { PayError, StockCheckItem } from "./PaymentStep.helpers";

type Props = {
  visible: boolean;
  shouldPrepare?: boolean;
  derivedAmountMajor: number;
  safeCurrency: string;
  isPayProcessing: boolean;
  preReserveLoading?: boolean;
  paypalUnavailable: boolean;
  paypalConsentRequired?: boolean;
  paypalDisabledText?: string;
  successMetaWithReservation: any;
  stockItems: StockCheckItem[];
  runStockReservePreflight: (items?: StockCheckItem[]) => Promise<any>;
  reservationIdRef: React.MutableRefObject<string | null>;
  setPayError: React.Dispatch<React.SetStateAction<PayError | null>>;
  setSuppressBlockedHint: React.Dispatch<React.SetStateAction<boolean>>;
  onPayInitiated: () => void;
  handlePaySucceeded: (paypalPayload: any) => void;
  handlePayFailed: (err: any) => Promise<void> | void;
};

type PreparedPayPalCheckout = {
  sessionToken: string;
  paypalOrderId: string;
  reservationId: string;
  checkoutSession: any;
};

function getApiBase() {
  const fromEnv = (process.env.NEXT_PUBLIC_WORKER_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "") as string;

  const base = String(fromEnv || "")
    .trim()
    .replace(/\/+$/, "");

  if (base) return base;

  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost") return "http://localhost:8787";
    if (h === "127.0.0.1") return "http://127.0.0.1:8787";
  }

  return "http://localhost:8787";
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body ?? {}),
  });

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}

function pickCheckoutEmail(meta: any): string {
  return String(
    meta?.checkoutEmail ??
      meta?.accountEmail ??
      meta?.email ??
      meta?.address?.email ??
      "",
  )
    .trim()
    .toLowerCase();
}

function normalizeCheckoutAddress(address: any, email: string) {
  const a = address || {};

  return {
    email,

    first_name:
      a.first_name ?? a.firstName ?? a.given_name ?? a.givenName ?? null,

    last_name:
      a.last_name ??
      a.lastName ??
      a.surname ??
      a.family_name ??
      a.familyName ??
      null,

    phone: a.phone ?? a.phone_number ?? a.phoneNumber ?? null,

    line1: a.line1 ?? a.address_line1 ?? a.addressLine1 ?? a.addr_line1 ?? null,

    line2: a.line2 ?? a.address_line2 ?? a.addressLine2 ?? a.addr_line2 ?? "",

    city: a.city ?? a.suburb ?? a.addr_city ?? null,

    state: a.state ?? a.province ?? a.region ?? a.addr_state ?? null,

    postcode:
      a.postcode ?? a.postal_code ?? a.postalCode ?? a.addr_postcode ?? null,

    country:
      a.country ?? a.country_code ?? a.countryCode ?? a.addr_country ?? null,
  };
}

function makeBackendError(
  resStatus: number,
  data: any,
  fallbackCode: string,
  fallbackMessage: string,
) {
  const backendCode = String(data?.error || data?.code || "").trim();
  const code = backendCode || fallbackCode;

  const backendMsg = String(data?.message || "").trim();
  const message =
    backendMsg ||
    fallbackMessage ||
    (resStatus ? `HTTP ${resStatus}` : "Request failed");

  return {
    status: resStatus || 0,
    code,
    message,
    detail: data ?? null,
  };
}

const PaymentStepPayAction: React.FC<Props> = ({
  visible,
  shouldPrepare = visible,
  derivedAmountMajor,
  safeCurrency,
  isPayProcessing,
  preReserveLoading = false,
  paypalUnavailable,
  paypalConsentRequired = false,
  paypalDisabledText,
  successMetaWithReservation,
  stockItems,
  runStockReservePreflight,
  reservationIdRef,
  setPayError,
  setSuppressBlockedHint,
  onPayInitiated,
  handlePaySucceeded,
  handlePayFailed,
}) => {
  const apiBase = useMemo(() => getApiBase(), []);

  const [prepareLoading, setPrepareLoading] = useState(false);
  const [prepareError, setPrepareError] = useState<any>(null);
  const [preparedCheckout, setPreparedCheckout] =
    useState<PreparedPayPalCheckout | null>(null);

  const prepareRunIdRef = useRef(0);

  const prepareKey = useMemo(() => {
    return JSON.stringify({
      shouldPrepare,
      amount: Number(derivedAmountMajor || 0).toFixed(2),
      currency: safeCurrency,
      reservationId: reservationIdRef.current || null,
      deliveryOption: successMetaWithReservation?.deliveryOption || null,
      checkoutTotals: successMetaWithReservation?.checkoutTotals || null,
      address: successMetaWithReservation?.address || null,
      email: pickCheckoutEmail(successMetaWithReservation),
      stockItems,
      paypalUnavailable,
      paypalConsentRequired,
    });
  }, [
    shouldPrepare,
    derivedAmountMajor,
    safeCurrency,
    successMetaWithReservation,
    stockItems,
    paypalUnavailable,
    paypalConsentRequired,
  ]);

  useEffect(() => {
    let cancelled = false;
    const runId = prepareRunIdRef.current + 1;
    prepareRunIdRef.current = runId;

    async function prepareCheckoutSessionAndPayPalOrder() {
      if (!shouldPrepare) return;
      if (!(derivedAmountMajor > 0)) return;
      if (isPayProcessing) return;
      if (preReserveLoading) return;
      if (paypalUnavailable) return;
      if (paypalConsentRequired) return;

      setPrepareLoading(true);
      setPrepareError(null);
      setPreparedCheckout(null);

      try {
        const reservationIdRaw = await runStockReservePreflight(stockItems);
        const reservationId = String(reservationIdRaw || "").trim();

        if (!reservationId) {
          throw {
            status: 400,
            code: "missing_reservation_id",
            message: "Missing reservation id when preparing PayPal checkout.",
            detail: null,
          };
        }

        reservationIdRef.current = reservationId;

        const checkoutTotals = successMetaWithReservation?.checkoutTotals;
        const itemsFromMeta = checkoutTotals?.items;

        if (!Array.isArray(itemsFromMeta) || itemsFromMeta.length === 0) {
          throw {
            status: 400,
            code: "missing_items",
            message: "Missing cart items for checkout session.",
            detail: { checkoutTotals },
          };
        }

        const finalCheckoutEmail = pickCheckoutEmail(
          successMetaWithReservation,
        );

        if (!finalCheckoutEmail) {
          throw {
            status: 400,
            code: "missing_email",
            message:
              "Email required for order. Please go back to the Address step and complete your email information.",
            detail: { successMetaWithReservation },
          };
        }

        const normalizedAddress = normalizeCheckoutAddress(
          successMetaWithReservation?.address,
          finalCheckoutEmail,
        );

        const checkoutCurrency = String(
          checkoutTotals?.currency || safeCurrency || "",
        )
          .trim()
          .toUpperCase();

        const deliveryOption = String(
          successMetaWithReservation?.deliveryOption || "standard",
        )
          .trim()
          .toLowerCase();

        const checkoutSessionBody = {
          email: finalCheckoutEmail,
          currency: checkoutCurrency,
          reservation_id: reservationId,
          items: itemsFromMeta,
          address: normalizedAddress,
          shipping_address: normalizedAddress,
          delivery_option: deliveryOption,
          auto_create_paypal_order: true,

          checkout_totals: checkoutTotals ?? null,
          meta: {
            ...(successMetaWithReservation?.meta || {}),
            __source: "frontend_payment_step_prepared_paypal_checkout",
          },
        };

        const { res: sessionRes, data: sessionResp } = await postJson(
          `${apiBase}/checkout/sessions`,
          checkoutSessionBody,
        );

        if (!sessionRes.ok || !sessionResp?.ok) {
          throw makeBackendError(
            sessionRes.status,
            sessionResp,
            "checkout_session_create_failed",
            "Failed to create checkout session.",
          );
        }

        const checkoutSession =
          sessionResp?.checkout_session || sessionResp?.checkoutSession;

        const sessionToken = String(
          checkoutSession?.session_token || checkoutSession?.sessionToken || "",
        ).trim();

        if (!sessionToken) {
          throw {
            status: sessionRes.status || 500,
            code: "missing_checkout_session_token",
            message:
              "Checkout session was created but no session token was returned.",
            detail: sessionResp,
          };
        }

        let paypalCreateResp: any = sessionResp;

        let paypalOrderId = String(
          sessionResp?.paypal_order?.id ||
            sessionResp?.paypalOrder?.id ||
            sessionResp?.paypalOrderId ||
            checkoutSession?.paypal_order_id ||
            checkoutSession?.paypalOrderId ||
            "",
        ).trim();

        let preparedCheckoutSession =
          sessionResp?.checkout_session ||
          sessionResp?.checkoutSession ||
          checkoutSession;

        // Fallback: older backend or failed auto-create path.
        // Keep the old endpoint as a compatibility fallback.
        if (!paypalOrderId) {
          const { res: paypalCreateRes, data: fallbackPayPalCreateResp } =
            await postJson(
              `${apiBase}/checkout/sessions/${encodeURIComponent(
                sessionToken,
              )}/paypal/create-order`,
              {},
            );

          if (!paypalCreateRes.ok || !fallbackPayPalCreateResp?.ok) {
            throw makeBackendError(
              paypalCreateRes.status,
              fallbackPayPalCreateResp,
              "paypal_create_order_failed",
              "Failed to create PayPal order.",
            );
          }

          paypalCreateResp = fallbackPayPalCreateResp;

          paypalOrderId = String(
            fallbackPayPalCreateResp?.paypal_order?.id ||
              fallbackPayPalCreateResp?.paypalOrder?.id ||
              fallbackPayPalCreateResp?.paypalOrderId ||
              "",
          ).trim();

          preparedCheckoutSession =
            fallbackPayPalCreateResp?.checkout_session ||
            fallbackPayPalCreateResp?.checkoutSession ||
            preparedCheckoutSession;
        }

        if (!paypalOrderId) {
          throw {
            status: 500,
            code: "missing_paypal_order_id",
            message:
              "PayPal order was created but no PayPal order id returned.",
            detail: paypalCreateResp,
          };
        }

        if (cancelled || prepareRunIdRef.current !== runId) return;

        setPreparedCheckout({
          sessionToken,
          paypalOrderId,
          reservationId,
          checkoutSession: preparedCheckoutSession,
        });
      } catch (err: any) {
        if (cancelled || prepareRunIdRef.current !== runId) return;

        console.error("[payment] prepare PayPal checkout failed:", err);
        setPrepareError(err);
        setPreparedCheckout(null);

        await handlePayFailed(err);
      } finally {
        if (!cancelled && prepareRunIdRef.current === runId) {
          setPrepareLoading(false);
        }
      }
    }

    void prepareCheckoutSessionAndPayPalOrder();

    return () => {
      cancelled = true;
    };
  }, [
    prepareKey,
    apiBase,
    shouldPrepare,
    derivedAmountMajor,
    safeCurrency,
    isPayProcessing,
    preReserveLoading,
    paypalUnavailable,
    paypalConsentRequired,
    successMetaWithReservation,
    stockItems,
    runStockReservePreflight,
    reservationIdRef,
    handlePayFailed,
  ]);

  if (!visible || !(derivedAmountMajor > 0)) return null;

  const showPreparing =
    !isPayProcessing &&
    !preReserveLoading &&
    !paypalUnavailable &&
    !paypalConsentRequired &&
    (prepareLoading || !preparedCheckout);

  return (
    <div className="w-full md:w-[260px] max-w-full">
      {isPayProcessing ? (
        <button
          type="button"
          disabled
          className="w-full rounded-full px-6 py-3.5 text-sm font-semibold bg-[#FFC439] text-[#111827] opacity-70 cursor-not-allowed shadow-sm"
        >
          Processing payment...
        </button>
      ) : preReserveLoading ? (
        <button
          type="button"
          disabled
          className="w-full rounded-full px-6 py-3.5 text-sm font-semibold bg-[#FFC439] text-[#111827] opacity-70 cursor-not-allowed shadow-sm"
        >
          Preparing PayPal...
        </button>
      ) : paypalConsentRequired ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="w-full rounded-full px-6 py-3.5 text-sm font-semibold bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-sm"
            title={paypalDisabledText || "Accept cookies to use PayPal"}
          >
            {paypalDisabledText || "Accept cookies to use PayPal"}
          </button>

          <p className="text-xs leading-5 text-neutral-500">
            PayPal is unavailable because your current cookie settings disable
            non-essential cookies and similar technologies.
          </p>

          <a
            href="/cookies"
            className="inline-block text-xs font-medium text-neutral-700 underline underline-offset-2 transition hover:text-neutral-900"
          >
            Change cookie settings
          </a>
        </div>
      ) : prepareError ? (
        <button
          type="button"
          disabled
          className="w-full rounded-full px-6 py-3.5 text-sm font-semibold bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-sm"
          title={
            prepareError?.message ||
            "PayPal checkout could not be prepared. Please check your checkout information."
          }
        >
          PayPal unavailable
        </button>
      ) : showPreparing ? (
        <button
          type="button"
          disabled
          className="w-full rounded-full px-6 py-3.5 text-sm font-semibold bg-[#FFC439] text-[#111827] opacity-70 cursor-not-allowed shadow-sm"
        >
          Preparing secure checkout...
        </button>
      ) : (
        <PayPalBigButton
          disabled={paypalUnavailable || !preparedCheckout}
          disabledText="PayPal unavailable"
          amount={derivedAmountMajor}
          currency={safeCurrency}
          successMeta={successMetaWithReservation}
          preflight={runStockReservePreflight}
          preflightItems={stockItems}
          preparedSessionToken={preparedCheckout?.sessionToken || null}
          preparedPayPalOrderId={preparedCheckout?.paypalOrderId || null}
          preparedReservationId={preparedCheckout?.reservationId || null}
          preparedCheckoutSession={preparedCheckout?.checkoutSession || null}
          onInitiate={() => {
            console.log(
              "[payment] initiating paypal with prepared reservationId =",
              reservationIdRef.current,
            );
            setPayError(null);
            setSuppressBlockedHint(true);
            onPayInitiated();
          }}
          onSucceeded={(paypalPayload) => {
            handlePaySucceeded(paypalPayload);
          }}
          onFailed={(err: any) => {
            void handlePayFailed(err);
          }}
        />
      )}
    </div>
  );
};

export default PaymentStepPayAction;
