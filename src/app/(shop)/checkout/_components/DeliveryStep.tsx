// src/app/checkout/_components/DeliveryStep.tsx
"use client";

import React from "react";
import { AlertCircle, Check } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { CURRENT_STOREFRONT, getShippingNotice } from "@/lib/market/current";

type DeliveryMethod = "standard" | "express";

const METHOD_META: Record<DeliveryMethod, { label: string; note?: string }> = {
  standard: {
    label: "Standard delivery",
    note: "Best value",
  },
  express: {
    label: "Express delivery",
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

      /** 客户侧预计送达时间，表示下单至送达的总工作日范围 */
      min_days?: number | null;
      max_days?: number | null;
      /** 仅供内部参考，不参与客户侧 ETA 计算或展示 */
      handling_days?: number | null;

      /** 可选：仓库、物流服务；eta_note 当前不在前台展示 */
      warehouse_code?: string | null;
      carrier_service?: string | null;
      eta_note?: string | null;
    }
  >
>;

type ShippingPromotionByMethod = Partial<
  Record<
    DeliveryMethod,
    {
      unlocked: boolean;
      discountPercent: number;

      kind: "none" | "free_shipping" | "half_price_shipping";

      reason:
        | null
        | "au_standard_delivery"
        | "au_express_delivery"
        | "au_tier_3_destination"
        | "au_fallback_destination";

      thresholdMinor: number | null;
      originalFeeMinor: number | null;
      discountMinor: number | null;
      finalFeeMinor: number | null;
      zoneName: string | null;
      zoneType: string | null;
      currency: string | null;
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

  itemsMinor?: number;

  shippingPromotionByMethod?: ShippingPromotionByMethod;

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
): { etaLine: string; noteLine: string | null } {
  const eta = etaByMethod?.[method];

  // ✅ 1) 主展示：优先使用 DB 的 min_days/max_days（不含 handling）
  const minShip = asPosIntOrNull(eta?.min_days);
  const maxShip = asPosIntOrNull(eta?.max_days);
  const shipLine = formatEtaLine(minShip, maxShip);

  const noteLine = null;

  if (shipLine) {
    return { etaLine: shipLine, noteLine };
  }

  // ✅ 2) 如果后端没给 min/max，再使用 total ETA（含 handling）
  const minTotal = asPosIntOrNull(eta?.eta_min_total);
  const maxTotal = asPosIntOrNull(eta?.eta_max_total);
  const totalLine = formatEtaLine(minTotal, maxTotal);

  if (totalLine) {
    return { etaLine: totalLine, noteLine };
  }

  // ✅ 3) 没有后端 ETA 时，不显示默认 ETA
  return { etaLine: "", noteLine: null };
}

function isPostcodeStateMismatchMessage(message: string) {
  const normalized = String(message || "")
    .trim()
    .toLowerCase();

  return (
    normalized.includes("address_postcode_state_mismatch") ||
    (normalized.includes("postcode") &&
      normalized.includes("state") &&
      (normalized.includes("not") ||
        normalized.includes("do not appear to match") ||
        normalized.includes("does not appear to match") ||
        normalized.includes("appears to be in")))
  );
}

function getShippingAlertTitle(message: string) {
  const normalized = String(message || "").toLowerCase();

  if (isPostcodeStateMismatchMessage(message)) {
    return "Postcode and state do not match";
  }

  if (
    normalized.includes("manual confirmation") ||
    normalized.includes("contact support before placing your order")
  ) {
    return "Shipping requires manual confirmation";
  }

  if (
    normalized.includes("do not ship") ||
    normalized.includes("shipping is unavailable") ||
    normalized.includes("currently do not ship")
  ) {
    return "Shipping unavailable";
  }

  if (
    normalized.includes("cannot be calculated automatically") ||
    normalized.includes("could not be calculated")
  ) {
    return "Shipping quote unavailable";
  }

  return "Shipping cannot be completed automatically";
}

function cleanShippingAlertMessage(message: string) {
  return String(message || "")
    .trim()
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ");
}

function getShippingAlertBody(message: string) {
  const trimmed = cleanShippingAlertMessage(message);

  if (isPostcodeStateMismatchMessage(trimmed)) {
    if (trimmed && trimmed !== "address_postcode_state_mismatch") {
      return trimmed;
    }

    return "Your postcode and state/region do not appear to match. Please go back to Address and check your State/Region or postcode.";
  }

  if (trimmed) return trimmed;

  return "Shipping could not be calculated for this address. Please check your postcode or contact support.";
}

function getShippingAlertHint(message: string) {
  if (isPostcodeStateMismatchMessage(message)) {
    return "Go back to Address and select the state/region that matches your postcode, or correct the postcode if it was entered incorrectly.";
  }

  return "You can go back to Address to check your postcode, or contact support if you believe this destination should be serviceable.";
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({
  deliveryMethod,
  setDeliveryMethod,
  showFreeShipping,
  standardFreeThresholdMinor = null,
  currency = null,
  itemsMinor = 0,
  deliveryFeeMinorByMethod = {},
  shippingPromotionByMethod = {},
  etaByMethod,

  quoteLoading = false,
  quoteError = null,
}) => {
  const cur =
    String(currency || "")
      .trim()
      .toUpperCase() || "AUD";
  const shippingNotice = getShippingNotice(CURRENT_STOREFRONT);
  const shippingRegionLabel = CURRENT_STOREFRONT.label;

  const feeTextOf = (method: DeliveryMethod) => {
    const value = deliveryFeeMinorByMethod?.[method];

    if (value == null) {
      return null;
    }

    const minor = Number(value);

    if (!Number.isFinite(minor)) {
      return null;
    }

    return formatMoney(minor, cur);
  };

  const selectedPromotion = shippingPromotionByMethod?.[deliveryMethod];

  const promotionThresholdMinor =
    selectedPromotion?.thresholdMinor ?? standardFreeThresholdMinor ?? null;

  const promotionThresholdText =
    promotionThresholdMinor != null
      ? formatMoney(promotionThresholdMinor, cur)
      : null;

  const remainingToPromotionMinor =
    promotionThresholdMinor != null
      ? Math.max(
          0,
          promotionThresholdMinor - Math.max(0, Number(itemsMinor) || 0),
        )
      : null;

  const promotionUnlocked =
    selectedPromotion?.unlocked === true ||
    (deliveryMethod === "standard" && showFreeShipping);

  const discountPercent = Number(selectedPromotion?.discountPercent ?? 0) || 0;

  const promotionTitle =
    promotionUnlocked && discountPercent === 100
      ? "Free standard shipping unlocked"
      : promotionUnlocked && discountPercent === 50
        ? deliveryMethod === "express"
          ? "50% Express shipping discount unlocked"
          : "50% shipping discount unlocked"
        : null;

  const promotionBody = (() => {
    if (
      !promotionUnlocked &&
      remainingToPromotionMinor != null &&
      remainingToPromotionMinor > 0
    ) {
      return `Add ${formatMoney(
        remainingToPromotionMinor,
        cur,
      )} more to unlock your shipping discount.`;
    }

    if (promotionUnlocked && discountPercent === 100) {
      return promotionThresholdText
        ? `Your order has reached ${promotionThresholdText} and this destination is eligible for free Standard delivery.`
        : "This destination is eligible for free Standard delivery.";
    }

    if (
      promotionUnlocked &&
      discountPercent === 50 &&
      deliveryMethod === "express"
    ) {
      return promotionThresholdText
        ? `Your order has reached ${promotionThresholdText}. Express delivery receives a 50% shipping discount.`
        : "Express delivery receives a 50% shipping discount.";
    }

    if (
      promotionUnlocked &&
      discountPercent === 50 &&
      selectedPromotion?.reason === "au_tier_3_destination"
    ) {
      return promotionThresholdText
        ? `Your order has reached ${promotionThresholdText}. Tier 3 destinations receive 50% off Standard delivery.`
        : "Tier 3 destinations receive 50% off Standard delivery.";
    }

    if (
      promotionUnlocked &&
      discountPercent === 50 &&
      selectedPromotion?.reason === "au_fallback_destination"
    ) {
      return promotionThresholdText
        ? `Your order has reached ${promotionThresholdText}. Australia Fallback destinations receive 50% off Standard delivery.`
        : "Australia Fallback destinations receive 50% off Standard delivery.";
    }

    return null;
  })();

  const finalFeeText =
    selectedPromotion?.finalFeeMinor != null
      ? formatMoney(selectedPromotion.finalFeeMinor, cur)
      : null;

  const statusAlert = (() => {
    if (quoteLoading) {
      return {
        type: "loading" as const,
        variant: "info" as const,
        title: "Calculating shipping",
        body: "We are checking the available delivery options for your address.",
      };
    }

    if (quoteError) {
      return {
        type: "error" as const,
        variant: "error" as const,
        title: getShippingAlertTitle(quoteError),
        body: getShippingAlertBody(quoteError),
      };
    }

    return null;
  })();

  return (
    <>
      {(promotionTitle || promotionBody) && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-3.5 w-3.5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="font-medium text-emerald-950">
                {promotionTitle || "Shipping offer available"}
              </div>

              {!promotionUnlocked && promotionBody ? (
                <div className="mt-0.5 text-xs text-emerald-900/75">
                  {promotionBody}
                </div>
              ) : null}
            </div>

            {promotionUnlocked && finalFeeText ? (
              <div className="shrink-0 text-right">
                <div className="text-[11px] text-emerald-900/60">Shipping</div>
                <div className="font-semibold text-emerald-950">
                  {finalFeeText}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <section className="rounded-xl border">
        <div className="border-b px-4 py-3 font-semibold">Delivery</div>

        <div className="space-y-3 p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-sm font-medium text-slate-900">
              {shippingNotice}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              Delivery addresses outside {shippingRegionLabel} are not
              supported.
            </div>
          </div>

          {(["standard", "express"] as DeliveryMethod[]).map((m) => {
            const selected = deliveryMethod === m;
            const { etaLine, noteLine } = formatEtaText(m, etaByMethod);

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
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">
                          {METHOD_META[m].label}
                        </div>

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

                    {feeText ? (
                      <div className="shrink-0 font-medium text-neutral-900">
                        {feeText}
                      </div>
                    ) : null}
                  </div>

                  {etaLine ? (
                    <div className="mt-1 text-sm text-neutral-600">
                      {etaLine}
                    </div>
                  ) : null}

                  {noteLine ? (
                    <div className="mt-1 text-xs text-neutral-500">
                      {noteLine}
                    </div>
                  ) : null}
                </div>
              </label>
            );
          })}

          {statusAlert ? (
            <div className="pt-2">
              <Alert
                variant={statusAlert.variant}
                role={statusAlert.type === "error" ? "alert" : "status"}
                className="flex gap-2"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                <div className="flex-1">
                  <div className="font-medium">{statusAlert.title}</div>

                  <div className="mt-1 text-xs leading-5">
                    {statusAlert.body}
                  </div>

                  {statusAlert.type === "error" ? (
                    <div className="mt-2 text-xs leading-5 opacity-80">
                      {getShippingAlertHint(statusAlert.body)}
                    </div>
                  ) : null}
                </div>
              </Alert>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
};

export default DeliveryStep;
