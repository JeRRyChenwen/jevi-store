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
      <div className="border rounded-lg p-4">
        <h3 className="text-base font-medium mb-3">Delivery Details</h3>

        {hasAddress ? (
          <div className="text-sm leading-6 text-gray-800 space-y-0.5">
            <div>{[address.firstName, address.lastName].filter(Boolean).join(" ")}</div>

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

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Items</div>
          <div className="text-base font-medium">
            {derivedItemsCount} item{derivedItemsCount > 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Subtotal</div>
          <div className="text-base font-medium">
            {fmtMoneyMinor(derivedItemsMinor, safeCurrency)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Delivery</div>
          <div className="text-base font-medium">
            {Number(deliveryFeeMinor) === 0
              ? "FREE"
              : fmtMoneyMinor(Number(deliveryFeeMinor) || 0, safeCurrency)}
          </div>
        </div>

        <div className="border-t pt-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Total</div>
          <div className="text-xl font-bold">
            {fmtMoneyMinor(derivedTotalMinor, safeCurrency)}
          </div>
        </div>

        {shouldShowReservationAlert && (
          <Alert variant="info" className="mt-3">
            <div className="flex items-start gap-2">
              <span className="text-base">🛍️</span>
              <div className="leading-5 flex-1">
                <div className="font-medium flex items-center justify-between gap-3">
                  <span>Your items are reserved.</span>

                  {typeof reservationSecondsLeft === "number" ? (
                    <span className="text-xs font-semibold tabular-nums rounded-md border bg-white px-2 py-0.5">
                      {String(Math.floor(reservationSecondsLeft / 60)).padStart(2, "0")}:
                      {String(reservationSecondsLeft % 60).padStart(2, "0")}
                    </span>
                  ) : (
                    <span className="text-xs opacity-70">--:--</span>
                  )}
                </div>

                <div className="text-xs opacity-90">
                  Please complete your payment before the reservation expires.
                </div>
              </div>
            </div>
          </Alert>
        )}
      </div>

      {actionSlot ? <div className="pt-0 flex justify-end">{actionSlot}</div> : null}
    </div>
  );
};

export default PaymentStepSummaryPanel;