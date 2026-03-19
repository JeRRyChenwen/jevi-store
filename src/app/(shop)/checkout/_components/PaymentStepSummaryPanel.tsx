// src/app/(shop)/checkout/_components/PaymentStepSummaryPanel.tsx
"use client";

import React from "react";
import { Alert } from "@/components/ui/alert";
import { fmtMoneyMinor, type PayError } from "./PaymentStep.helpers";
import type { Address } from "./PaymentStep.types";

type Props = {
  address: Address;
  hasAddress: boolean;
  countryDisplay: string;
  effectiveOrderEmail: string;
  derivedItemsCount: number;
  derivedItemsMinor: number;
  deliveryFeeMinor: number;
  derivedTotalMinor: number;
  safeCurrency: string;
  visible: boolean;
  reservationId: string | null;
  reservationSecondsLeft: number | null;
  payError: PayError | null;
  actionSlot?: React.ReactNode;
};

const PaymentStepSummaryPanel: React.FC<Props> = ({
  address,
  hasAddress,
  countryDisplay,
  effectiveOrderEmail,
  derivedItemsCount,
  derivedItemsMinor,
  deliveryFeeMinor,
  derivedTotalMinor,
  safeCurrency,
  visible,
  reservationId,
  reservationSecondsLeft,
  payError,
  actionSlot,
}) => {
  const shouldShowReservationAlert =
    visible &&
    reservationId &&
    !(
      payError &&
      (payError.type === "out_of_stock" ||
        payError.type === "reservation_expired" ||
        payError.type === "reservation_failed")
    );

  return (
    <div className="space-y-4">
      <div className="border rounded-xl p-4 bg-white space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-normal text-gray-600">Items</div>
            <div className="text-sm font-medium text-neutral-900">
              {derivedItemsCount} item{derivedItemsCount > 1 ? "s" : ""}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-normal text-gray-600">Subtotal</div>
            <div className="text-sm font-medium text-neutral-900">
              {fmtMoneyMinor(derivedItemsMinor, safeCurrency)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm font-normal text-gray-600">Delivery</div>
            <div className="text-sm font-medium text-neutral-900">
              {Number(deliveryFeeMinor) === 0
                ? "FREE"
                : fmtMoneyMinor(Number(deliveryFeeMinor) || 0, safeCurrency)}
            </div>
          </div>

          <div className="border-t pt-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-900">Total</div>
            <div className="text-sm font-semibold text-neutral-950">
              {fmtMoneyMinor(derivedTotalMinor, safeCurrency)}
            </div>
          </div>
        </div>

        {shouldShowReservationAlert && (
          <Alert variant="info" className="mt-1 rounded-xl">
            <div className="flex items-start gap-2.5">
              <span className="text-sm">🛍️</span>
              <div className="leading-5 flex-1">
                <div className="font-medium text-sm flex items-center justify-between gap-3">
                  <span>Your items are reserved.</span>

                  {typeof reservationSecondsLeft === "number" ? (
                    <span className="text-xs font-semibold tabular-nums rounded-md border bg-white px-2.5 py-1">
                      {String(Math.floor(reservationSecondsLeft / 60)).padStart(2, "0")}:
                      {String(reservationSecondsLeft % 60).padStart(2, "0")}
                    </span>
                  ) : (
                    <span className="text-xs opacity-70">--:--</span>
                  )}
                </div>

                <div className="text-xs opacity-90 mt-0.5">
                  Please complete your payment before the reservation expires.
                </div>
              </div>
            </div>
          </Alert>
        )}

        {actionSlot ? <div className="pt-1">{actionSlot}</div> : null}
      </div>

      <div className="border rounded-xl p-4 bg-white">
        <h3 className="text-base font-semibold mb-3 text-neutral-900">
          Delivery Details
        </h3>

        {hasAddress ? (
          <div className="text-sm leading-7 text-gray-800 space-y-0.5">
            <div>
              {[address.firstName, address.lastName].filter(Boolean).join(" ")}
            </div>

            {address.line1 && (
              <div>
                {address.line1}
                {address.line2 ? ` ${address.line2}` : ""}
              </div>
            )}

            {(address.city || address.state || address.postcode) && (
              <div>
                {[address.city, address.state, address.postcode]
                  .filter(Boolean)
                  .join(" ")}
              </div>
            )}

            {countryDisplay && <div>{countryDisplay}</div>}
            {effectiveOrderEmail && <div className="mt-2">{effectiveOrderEmail}</div>}
            {address.phone && <div>{address.phone}</div>}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No delivery address found. Please complete the <b>Address</b> step.
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentStepSummaryPanel;