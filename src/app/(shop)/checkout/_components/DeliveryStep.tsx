// src/app/checkout/_components/DeliveryStep.tsx
"use client";

import React from "react";
import { Check } from "lucide-react";

type DeliveryMethod = "standard" | "express";

const METHOD_META: Record<
  DeliveryMethod,
  { label: string; eta: string; note?: string }
> = {
  standard: {
    label: "Standard delivery",
    eta: "Arrives in 3–5 business days",
    note: "Best value",
  },
  express: {
    label: "Express delivery",
    eta: "Arrives in 1–2 business days",
    note: "Fastest option",
  },
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
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border px-4 py-3 text-sm"
        >
          <div className="flex items-start gap-2">
            <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1">
              <div className="font-medium">
                Free shipping unlocked
              </div>
              <div className="text-neutral-600">
                You&apos;ve reached the free shipping threshold.
              </div>

              <div className="mt-2 h-1 w-full overflow-hidden rounded bg-neutral-200">
                <div className="h-full w-full bg-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 下面是 Delivery 选项本体 */}
      <section className="rounded-xl border">
        <div className="border-b px-4 py-3 font-semibold">Delivery</div>

        <div className="p-4 space-y-3">
          {(["standard", "express"] as DeliveryMethod[]).map((m) => {
            const selected = deliveryMethod === m;

            return (
              <label
                key={m}
                className={[
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  selected
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300",
                ].join(" ")}
                aria-checked={selected}
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  className="mt-1"
                  checked={selected}
                  onChange={() => setDeliveryMethod(m)}
                />

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{METHOD_META[m].label}</div>

                    {/* 业内常见：给选项一个小的“标签”辅助决策 */}
                    {METHOD_META[m].note ? (
                      <span
                        className={[
                          "text-xs rounded-full px-2 py-0.5 border",
                          selected
                            ? "border-neutral-900 text-neutral-900"
                            : "border-neutral-200 text-neutral-600",
                        ].join(" ")}
                      >
                        {METHOD_META[m].note}
                      </span>
                    ) : null}
                  </div>

                  <div className="text-sm text-neutral-600">
                    {METHOD_META[m].eta}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default DeliveryStep;
