// src/app/(shop)/checkout/_components/PaymentStepStatusAlerts.tsx
"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import type { PayError } from "./PaymentStep.helpers";
import type { OutOfStockDisplay } from "./PaymentStep.error-utils";

type Props = {
  visible: boolean;
  payError: PayError | null;
  outOfStockDisplay: OutOfStockDisplay | null;
  preReserveLoading?: boolean;
  payBlockedReason?: string | null;
};

const PaymentStepStatusAlerts: React.FC<Props> = ({
  visible,
  payError,
  outOfStockDisplay,
  preReserveLoading,
  payBlockedReason,
}) => {
  if (!visible) return null;

  return (
    <>
      {payError && (
        <Alert variant="error" className="flex gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium">{payError.message}</div>

            {payError.type === "out_of_stock" && (
              <div className="mt-2 text-xs leading-5">
                {outOfStockDisplay?.title ? (
                  <div>
                    <b>Item:</b> {outOfStockDisplay.title}
                  </div>
                ) : null}

                {outOfStockDisplay?.variantLine ? (
                  <div>
                    <b>Variant:</b> {outOfStockDisplay.variantLine}
                  </div>
                ) : null}

                <div className="mt-1">
                  <b>In stock:</b>{" "}
                  {typeof outOfStockDisplay?.current === "number"
                    ? outOfStockDisplay.current
                    : "0"}
                  {"  "}
                  <span className="mx-1">|</span>
                  <b>You selected:</b>{" "}
                  {typeof outOfStockDisplay?.requested === "number"
                    ? outOfStockDisplay.requested
                    : "0"}
                </div>

                <div className="mt-2">
                  Please adjust the quantity or remove the item in your bag, then
                  try paying again.
                </div>
              </div>
            )}

            {payError.type === "reservation_expired" && (
              <div className="mt-2 text-xs leading-5">
                <div>Your reserved items are no longer held.</div>
                <div className="mt-1">
                  Please try paying again before the stock is taken by someone else.
                </div>
              </div>
            )}

            {payError.type === "reservation_failed" && (
              <div className="mt-2 text-xs leading-5">
                <div>
                  This usually happens when the reservation expired, the bag changed,
                  the reservation was released, or the payment was retried.
                </div>
                <div className="mt-1">Tip: refresh the page and try again.</div>
              </div>
            )}

            {payError.type === "amount_mismatch" && (
              <div className="mt-2 text-xs leading-5">
                <div>The order total changed during checkout.</div>
                <div className="mt-1">
                  Please refresh the page and check out again.
                </div>
              </div>
            )}

            {payError.type === "server_error" && (
              <div className="mt-2 text-xs leading-5">
                <div>We encountered a temporary issue.</div>
                <div className="mt-1">Please try again in a moment.</div>
              </div>
            )}
          </div>
        </Alert>
      )}

      {!payError && preReserveLoading ? (
        <Alert variant="info" className="flex gap-2">
          <span className="mt-0.5 text-base">ℹ️</span>
          <div>Reserving stock… Please wait a moment.</div>
        </Alert>
      ) : null}

      {!payError && !preReserveLoading && payBlockedReason ? (
        <Alert variant="error" className="flex gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div>{payBlockedReason}</div>
        </Alert>
      ) : null}
    </>
  );
};

export default PaymentStepStatusAlerts;