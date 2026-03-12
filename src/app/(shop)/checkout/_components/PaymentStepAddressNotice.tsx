// src/app/(shop)/checkout/_components/PaymentStepAddressNotice.tsx
"use client";

import React from "react";

const PaymentStepAddressNotice: React.FC = () => {
  return (
    <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 flex gap-2">
      <span className="mt-0.5 text-base">ℹ️</span>
      <div>
        <div className="font-medium">Make sure your delivery address is correct!</div>
        <div className="text-xs text-blue-900">
          You can go back to the Address step to make changes.
        </div>
      </div>
    </div>
  );
};

export default PaymentStepAddressNotice;