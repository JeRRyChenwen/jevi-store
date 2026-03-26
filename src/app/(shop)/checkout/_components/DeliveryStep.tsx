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

      /** ✅ 数据库里通常是这三个（不含 total） */
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

  showFreeShipping: boolean;

  standardFreeThresholdMinor?: number | null;
  currency?: string | null;

  deliveryFeeMinorByMethod?: Partial<Record<DeliveryMethod, number | null>>;

  /**
   * ✅ 后端 ETA
   * - 主 ETA：优先用 min_days/max_days（对齐 DB）
   * - handling：不显示（你要求隐藏）
   * - 如果 min/max 不存在，再 fallback 到 total ETA
   */
  etaByMethod?: EtaByMethod;

  /**
   * ✅ NEW：把 quote 状态传进来，用于在 Delivery 框内统一展示底部状态条
   * - quoteLoading 时：选项下面不显示任何 ETA（留空），底部显示 "Calculating shipping…"
   * - quoteError 时：底部显示错误文案（仍在框内）
   * - quoteMatchedText 时：底部显示 matched 文案（仍在框内）
   */
  quoteLoading?: boolean;
  quoteError?: string | null;
  quoteMatchedText?: string | null;
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

function asPosIntOrNull(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function formatEtaLine(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;

  if (min != null && max != null) {
    if (min === max) return `Arrives in ${min} business days`;
    return `Arrives in ${min}–${max} business days`;
  }

  const only = min ?? max!;
  return `Arrives in ${only} business days`;
}

function formatEtaText(
  method: DeliveryMethod,
  etaByMethod?: EtaByMethod,
  opts?: { suppressFallback?: boolean }
): { etaLine: string; noteLine: string | null } {
  const eta = etaByMethod?.[method];

  // ✅ 1) 主展示：优先使用 DB 的 min_days/max_days（不含 handling）
  const minShip = asPosIntOrNull(eta?.min_days);
  const maxShip = asPosIntOrNull(eta?.max_days);
  const shipLine = formatEtaLine(minShip, maxShip);

  const noteLine =
    eta?.eta_note != null && String(eta.eta_note).trim()
      ? String(eta.eta_note).trim()
      : null;

  if (shipLine) {
    return { etaLine: shipLine, noteLine };
  }

  // ✅ 2) fallback：如果后端没给 min/max，则用 total ETA（含 handling）
  const minTotal = asPosIntOrNull(eta?.eta_min_total);
  const maxTotal = asPosIntOrNull(eta?.eta_max_total);
  const totalLine = formatEtaLine(minTotal, maxTotal);
  if (totalLine) {
    return { etaLine: totalLine, noteLine };
  }

  // ✅ 关键：quoteLoading 时，不要回退到写死 ETA（留空）
  if (opts?.suppressFallback) {
    return { etaLine: "", noteLine: null };
  }

  // ✅ 3) 兜底：写死文案（只在非 loading 时允许）
  return { etaLine: METHOD_META[method].eta, noteLine: null };
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({
  deliveryMethod,
  setDeliveryMethod,
  showFreeShipping,
  standardFreeThresholdMinor = null,
  currency = null,
  deliveryFeeMinorByMethod = {},
  etaByMethod,

  quoteLoading = false,
  quoteError = null,
  quoteMatchedText = null,
}) => {
  const cur = String(currency || "").trim().toUpperCase() || "AUD";

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

  const feeTextOf = (m: DeliveryMethod) => {
    const v = deliveryFeeMinorByMethod?.[m];
    if (v == null) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    // 这里你截图里想要 A$10.00 这种展示，我们用 Intl 做本地化
    return formatMoney(n, cur);
  };

  const statusLine = (() => {
    if (quoteLoading) return { text: "Calculating shipping…", cls: "text-neutral-500" };
    if (quoteError) return { text: `Shipping quote unavailable (fallback applied). (${quoteError})`, cls: "text-amber-600" };
    if (quoteMatchedText) return { text: quoteMatchedText, cls: "text-neutral-500" };
    return null;
  })();

  return (
    <>
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
                    <span className="font-medium text-neutral-900">Standard</span>{" "}
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

      <section className="rounded-xl border">
        <div className="border-b px-4 py-3 font-semibold">Delivery</div>

        <div className="space-y-3 p-4">
          {(["standard", "express"] as DeliveryMethod[]).map((m) => {
            const selected = deliveryMethod === m;
            const { etaLine, noteLine } = formatEtaText(m, etaByMethod, {
              suppressFallback: quoteLoading, // ✅ loading 时不显示写死 ETA
            });

            const feeText = feeTextOf(m);

            return (
              <label
                key={m}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
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
                  <div className="flex items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{METHOD_META[m].label}</div>

                        {METHOD_META[m].note ? (
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-xs",
                              selected
                                ? "border-neutral-900 text-neutral-900"
                                : "border-neutral-200 text-neutral-600",
                            ].join(" ")}
                          >
                            {METHOD_META[m].note}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* ✅ ETA：loading 时留空；quote 完成后显示数据库时效 */}
                  <div className="mt-1 min-h-[20px] text-sm text-neutral-600">
                    {etaLine ? etaLine : ""}
                  </div>

                  {/* ✅ 备注（可选） */}
                  {noteLine ? (
                    <div className="mt-1 text-xs text-neutral-500">{noteLine}</div>
                  ) : null}
                </div>
              </label>
            );
          })}

          {/* ✅ 统一底部状态条：始终在 Delivery 框内 */}
          {statusLine ? (
            <div className="pt-2">
              <div className={["text-sm", statusLine.cls].join(" ")}>
                {statusLine.text}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};

export default DeliveryStep;
