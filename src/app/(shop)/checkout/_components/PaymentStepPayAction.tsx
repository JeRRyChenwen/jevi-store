"use client";

import React from "react";
import PayPalBigButton from "./PayPalBigButton";
import type { PayError, StockCheckItem } from "./PaymentStep.helpers";

type Props = {
  visible: boolean;
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

const PaymentStepPayAction: React.FC<Props> = ({
  visible,
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
  if (!visible || !(derivedAmountMajor > 0)) return null;

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
      ) : (
        <PayPalBigButton
          disabled={paypalUnavailable}
          disabledText="PayPal unavailable"
          amount={derivedAmountMajor}
          currency={safeCurrency}
          successMeta={successMetaWithReservation}
          preflight={runStockReservePreflight}
          preflightItems={stockItems}
          onInitiate={() => {
            console.log(
              "[payment] initiating paypal with reservationId =",
              reservationIdRef.current
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