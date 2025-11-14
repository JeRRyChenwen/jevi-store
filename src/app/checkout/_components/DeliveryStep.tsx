// src/app/checkout/_components/DeliveryStep.tsx
"use client";

import React from "react";

type DeliveryMethod = "standard" | "express";

const METHOD_META: Record<DeliveryMethod, { label: string; eta: string }> = {
  standard: { label: "Standard delivery", eta: "Arrives in 3–5 business days" },
  express: { label: "Express delivery", eta: "Arrives in 1–2 business days" },
};

type DeliveryStepProps = {
  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (v: DeliveryMethod) => void;
  showFreeShipping: boolean; // 是否显示“恭喜你，免邮”那条横幅
};

const DeliveryStep: React.FC<DeliveryStepProps> = ({
  deliveryMethod,
  setDeliveryMethod,
  showFreeShipping,
}) => {
  return (
    <>
      {/* 顶部：达到免邮门槛提示 */}
      {showFreeShipping && (
        <div className="rounded-xl border px-4 py-3 text-sm">
          <div className="mb-2 font-medium">
            Congratulations! You have reached free shipping
          </div>
          <div className="h-1 w-full overflow-hidden rounded bg-neutral-200">
            <div className="h-full w-full bg-emerald-600" />
          </div>
        </div>
      )}

      {/* 下面是 Delivery 选项本体 */}
      <section className="rounded-xl border">
        <div className="border-b px-4 py-3 font-semibold">Delivery</div>
        <div className="p-4 space-y-3">
          {(["standard", "express"] as DeliveryMethod[]).map((m) => (
            <label
              key={m}
              className="flex items-start gap-3 rounded-lg border p-3 has-[:checked]:border-neutral-900 cursor-pointer"
            >
              <input
                type="radio"
                name="deliveryMethod"
                className="mt-1"
                checked={deliveryMethod === m}
                onChange={() => setDeliveryMethod(m)}
              />
              <div className="flex-1">
                <div className="font-medium">{METHOD_META[m].label}</div>
                <div className="text-sm text-neutral-600">
                  {METHOD_META[m].eta}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>
    </>
  );
};

export default DeliveryStep;
