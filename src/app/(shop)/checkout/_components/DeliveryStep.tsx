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

  /**
   * ✅ 是否显示免运费达标提示：建议由父组件用后端返回的
   * standard_free_unlocked 来决定。
   */
  showFreeShipping: boolean;

  /**
   * ✅ 新增：免运费门槛（minor），以及货币
   * 用于文案更准确（不再“只有 fee=0 才显示”）
   */
  standardFreeThresholdMinor?: number | null;
  currency?: string | null;

  /**
   * ✅ 新增：当前 standard/express 运费（minor），用于文案告诉用户
   * “Express 仍需支付 X”
   */
  deliveryFeeMinorByMethod?: Partial<Record<DeliveryMethod, number | null>>;
};

function formatMoney(minor: number, currency: string) {
  // 你项目里如果已有 formatMoney/formatPrice，请优先替换成你自己的函数
  // 这里做一个通用的兜底：minor -> dollars
  const amount = (Number(minor) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    // Intl 失败兜底
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({
  deliveryMethod,
  setDeliveryMethod,
  showFreeShipping,
  standardFreeThresholdMinor = null,
  currency = "AUD",
  deliveryFeeMinorByMethod = {},
}) => {
  const cur = String(currency || "AUD");

  const thresholdText =
    standardFreeThresholdMinor != null
      ? formatMoney(standardFreeThresholdMinor, cur)
      : null;

  const expressFeeMinor =
    deliveryFeeMinorByMethod.express != null
      ? Number(deliveryFeeMinorByMethod.express)
      : null;

  const expressFeeText =
    expressFeeMinor != null ? formatMoney(expressFeeMinor, cur) : null;

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
              <div className="font-medium">Free shipping unlocked</div>

              {/* ✅ 新文案：强调只对 standard 免运费，express 可能仍需付费/仅减免 */}
              <div className="text-neutral-600">
                {thresholdText ? (
                  <>
                    You&apos;ve reached the free shipping threshold{" "}
                    <span className="font-medium text-neutral-900">
                      ({thresholdText})
                    </span>{" "}
                    for <span className="font-medium text-neutral-900">Standard</span>{" "}
                    delivery.{" "}
                    {expressFeeText ? (
                      <>
                        Express delivery may still have a fee (currently{" "}
                        <span className="font-medium text-neutral-900">
                          {expressFeeText}
                        </span>
                        ).
                      </>
                    ) : (
                      <>
                        Express delivery may still have an additional fee.
                      </>
                    )}
                  </>
                ) : (
                  <>
                    You&apos;ve reached the free shipping threshold for{" "}
                    <span className="font-medium text-neutral-900">Standard</span>{" "}
                    delivery. Express delivery may still have an additional fee.
                  </>
                )}
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
