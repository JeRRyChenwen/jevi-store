// src/app/(shop)/checkout/_components/PaymentStepMethodPanel.tsx
"use client";

import React from "react";
import Image from "next/image";

type Props = {
  method: "card" | "paypal";
  setMethod: React.Dispatch<React.SetStateAction<"card" | "paypal">>;
};

const PaymentStepMethodPanel: React.FC<Props> = ({ method, setMethod }) => {
  return (
    <div className="border rounded-lg p-4 h-auto md:h-[460px] flex flex-col">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Choose a way to pay</h3>

        <button
          type="button"
          onClick={() => setMethod("paypal")}
          className={[
            "w-full flex items-center justify-between rounded-md border px-3 py-3 text-sm text-left",
            method === "paypal"
              ? "border-neutral-900 bg-neutral-50"
              : "border-neutral-300 hover:bg-neutral-50",
          ].join(" ")}
        >
          <span className="font-medium">PayPal</span>
          <span className="inline-flex items-center rounded-sm border border-neutral-300 bg-white px-1.5 py-0.5">
            <div className="relative h-6 w-14">
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