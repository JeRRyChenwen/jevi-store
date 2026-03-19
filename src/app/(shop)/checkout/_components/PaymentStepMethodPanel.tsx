"use client";

import React from "react";
import Image from "next/image";

type Props = {
  method: "card" | "paypal";
  setMethod: React.Dispatch<React.SetStateAction<"card" | "paypal">>;
};

const PaymentStepMethodPanel: React.FC<Props> = ({ method, setMethod }) => {
  const isPaypal = method === "paypal";

  return (
    <div className="border rounded-xl p-4 md:p-4 h-auto md:h-[460px] flex flex-col bg-white">
      <div className="space-y-3">
        <h3 className="text-base md:text-sm font-semibold text-neutral-900">
          Choose a way to pay
        </h3>

        <button
          type="button"
          onClick={() => setMethod("paypal")}
          className={[
            "w-full flex items-center justify-between rounded-xl border px-4 py-4 text-left transition-all",
            isPaypal
              ? "border-neutral-900 bg-neutral-50 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
              : "border-neutral-300 bg-white hover:bg-neutral-50",
          ].join(" ")}
          aria-pressed={isPaypal}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={[
                "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-all",
                isPaypal
                  ? "border-black bg-black text-white"
                  : "border-neutral-300 bg-white text-transparent",
              ].join(" ")}
            >
              ✓
            </span>

            <div className="min-w-0">
              <div className="text-lg md:text-sm font-semibold text-neutral-900">
                PayPal
              </div>
              <div className="text-xs text-neutral-500">
                Fast and secure checkout
              </div>
            </div>
          </div>

          <span className="inline-flex items-center rounded-md border border-neutral-300 bg-white px-2 py-1">
            <div className="relative h-6 w-16">
              <Image src="/cards/paypal.svg" alt="PayPal" fill className="object-contain" />
            </div>
          </span>
        </button>
      </div>

      <div className="hidden md:flex mt-5 border-t pt-4 flex-1 flex-col">
        <div className="flex-1" />
      </div>
    </div>
  );
};

export default PaymentStepMethodPanel;