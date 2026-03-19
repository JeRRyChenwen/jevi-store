"use client";

import React from "react";

const PaymentStepAddressNotice: React.FC = () => {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/90 px-3.5 py-3 text-blue-800 flex gap-3 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset]">
      <span className="mt-0.5 text-sm leading-none">ℹ️</span>
      <div className="min-w-0">
        <div className="font-semibold text-[13px] leading-4">
          Make sure your delivery address is correct!
        </div>
        <div className="mt-1 text-[12px] leading-4 text-blue-900/90">
          You can go back to the Address step to make changes.
        </div>
      </div>
    </div>
  );
};

export default PaymentStepAddressNotice;