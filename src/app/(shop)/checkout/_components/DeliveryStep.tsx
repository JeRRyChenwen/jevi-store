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

type EtaByMethod = Partial<
  Record<
    DeliveryMethod,
    {
      /** 后端返回：total ETA（含 handling） */
      eta_min_total?: number | null;
      eta_max_total?: number | null;

      /** 可选：如果你未来想展示拆分，也可以传 */
      min_days?: number | null;
      max_days?: number | null;
      handling_days?: number | null;

      /** 可选：仓库、物流服务、备注 */
      warehouse_code?: string | null;
      carrier_service?: string | null;
      eta_note?: string | null;
    }
  >
>;

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

  /**
   * ✅ NEW：后端 ETA（建议来自 /shipping/quote 的返回）
   * - 优先展示 eta_min_total/eta_max_total
   * - 不传则回退 METHOD_META 里的写死文案（保证兼容）
   */
  etaByMethod?: EtaByMethod;
};

function formatMoney(minor: number, currency: string) {
  const amount = (Number(minor) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatEtaText(
  method: DeliveryMethod,
  etaByMethod?: EtaByMethod
): { etaLine: string; noteLine: string | null } {
  const eta = etaByMethod?.[method];
  const a = eta?.eta_min_total;
  const b = eta?.eta_max_total;

  const hasA = a != null && Number.isFinite(Number(a)) && Number(a) > 0;
  const hasB = b != null && Number.isFinite(Number(b)) && Number(b) > 0;

  // ✅ 优先：展示 total ETA（handling + shipping）
  if (hasA && hasB) {
    const min = Math.floor(Number(a));
    const max = Math.floor(Number(b));
    const etaLine =
      min === max
        ? `Arrives in ${min} business days`
        : `Arrives in ${min}–${max} business days`;

    const noteLine =
      eta?.eta_note != null && String(eta.eta_note).trim()
        ? String(eta.eta_note).trim()
        : null;

    return { etaLine, noteLine };
  }

  // ✅ 兼容：没传 ETA 就用你原来的写死文案
  return { etaLine: METHOD_META[method].eta, noteLine: null };
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({
  deliveryMethod,
  setDeliveryMethod,
  showFreeShipping,
  standardFreeThresholdMinor = null,
  currency = "AUD",
  deliveryFeeMinorByMethod = {},
  etaByMethod,
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

              <div className="text-neutral-600">
                {thresholdText ? (
                  <>
                    You&apos;ve reached the free shipping threshold{" "}
                    <span className="font-medium text-neutral-900">
                      ({thresholdText})
                    </span>{" "}
                    for{" "}
                    <span className="font-medium text-neutral-900">
                      Standard
                    </span>{" "}
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
                      <>Express delivery may still have an additional fee.</>
                    )}
                  </>
                ) : (
                  <>
                    You&apos;ve reached the free shipping threshold for{" "}
                    <span className="font-medium text-neutral-900">
                      Standard
                    </span>{" "}
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
            const { etaLine, noteLine } = formatEtaText(m, etaByMethod);

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

                  <div className="text-sm text-neutral-600">{etaLine}</div>

                  {/* ✅ 可选：如果后端未来写了 eta_note，就显示在 ETA 下方 */}
                  {noteLine ? (
                    <div className="mt-1 text-xs text-neutral-500">
                      {noteLine}
                    </div>
                  ) : null}
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
