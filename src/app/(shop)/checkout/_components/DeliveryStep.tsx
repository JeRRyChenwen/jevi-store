// src/app/checkout/_components/DeliveryStep.tsx
"use client";

import React from "react";
import { Check } from "lucide-react";

type DeliveryMethod = "standard" | "express";

const METHOD_META: Record<DeliveryMethod, { label: string; eta: string; note?: string }> = {
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
      eta_min_total?: number | null;
      eta_max_total?: number | null;

      min_days?: number | null;
      max_days?: number | null;
      handling_days?: number | null;

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

  etaByMethod?: EtaByMethod;

  /** ✅ NEW：是否正在计算shipping */
  loading?: boolean;
};

function formatMoney(minor: number, currency: string) {
  const amount = (Number(minor) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
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
  loading?: boolean
): { etaLine: string; noteLine: string | null } {
  const eta = etaByMethod?.[method];

  // 🚨 关键：loading 时不要显示默认 ETA
  if (loading) {
    return { etaLine: "Calculating shipping…", noteLine: null };
  }

  // 1️⃣ 优先：数据库 min/max（不含handling）
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

  // 2️⃣ fallback：total ETA
  const minTotal = asPosIntOrNull(eta?.eta_min_total);
  const maxTotal = asPosIntOrNull(eta?.eta_max_total);
  const totalLine = formatEtaLine(minTotal, maxTotal);
  if (totalLine) {
    return { etaLine: totalLine, noteLine };
  }

  // 3️⃣ 最后兜底（只有非loading才会走到这里）
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
  loading = false, // ✅ new
}) => {
  const cur = String(currency || "AUD");

  const thresholdText =
    standardFreeThresholdMinor != null ? formatMoney(standardFreeThresholdMinor, cur) : null;

  const expressFeeMinor =
    deliveryFeeMinorByMethod.express != null ? Number(deliveryFeeMinorByMethod.express) : null;

  const expressFeeText = expressFeeMinor != null ? formatMoney(expressFeeMinor, cur) : null;

  return (
    <>
      {showFreeShipping && (
        <div role="status" aria-live="polite" className="rounded-xl border px-4 py-3 text-sm">
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
                    <span className="font-medium text-neutral-900">({thresholdText})</span> for{" "}
                    <span className="font-medium text-neutral-900">Standard</span> delivery.{" "}
                    {expressFeeText ? (
                      <>
                        Express delivery may still have a fee (currently{" "}
                        <span className="font-medium text-neutral-900">{expressFeeText}</span>).
                      </>
                    ) : (
                      <>Express delivery may still have an additional fee.</>
                    )}
                  </>
                ) : (
                  <>
                    You&apos;ve reached the free shipping threshold for{" "}
                    <span className="font-medium text-neutral-900">Standard</span> delivery.
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
            const { etaLine, noteLine } = formatEtaText(m, etaByMethod, loading);

            return (
              <label
                key={m}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  selected
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300",
                ].join(" ")}
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

                  <div className="text-sm text-neutral-600">{etaLine}</div>

                  {noteLine ? (
                    <div className="mt-1 text-xs text-neutral-500">{noteLine}</div>
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
