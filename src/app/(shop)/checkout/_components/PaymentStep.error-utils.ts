// src/app/(shop)/checkout/_components/PaymentStep.error-utils.ts

import {
  buildVariantLineFromOptions,
  getCartSku,
  type PayError,
} from "./PaymentStep.helpers";

export type OutOfStockDisplay = {
  title: string | null;
  variantLine: string | null;
  sku: string | null;
  current: number | null | undefined;
  requested: number | null | undefined;
};

export function getOutOfStockDisplay(
  payError: PayError | null,
  cart: any[]
): OutOfStockDisplay | null {
  if (!payError || payError.type !== "out_of_stock") return null;

  const sku = String(payError.detail?.sku || "").trim();
  const list = Array.isArray(cart) ? cart : [];

  const hit = sku
    ? list.find((it: any) => {
        const s = getCartSku(it);
        return s && s === sku;
      })
    : null;

  const titleFromCart = String(
    hit?.title ?? hit?.product_title ?? hit?.name ?? ""
  ).trim();
  const titleFromServer = String(payError.detail?.product_title ?? "").trim();
  const title = titleFromCart || titleFromServer || "";

  const attrs = hit?.attrs ?? hit?.snapshot?.attrs ?? {};
  const options = hit?.options ?? hit?.snapshot?.options ?? {};

  const color = String(hit?.color ?? options?.color ?? attrs?.color ?? "").trim();
  const size = String(hit?.size ?? options?.size ?? attrs?.size ?? "").trim();

  const height =
    hit?.heightIncreaseCm ??
    options?.heightIncreaseCm ??
    attrs?.heightIncreaseCm ??
    attrs?.height_increase_cm ??
    null;

  const material = String(
    hit?.material ?? options?.material ?? attrs?.material ?? ""
  ).trim();

  const heightLabel =
    typeof height === "number" ? `${height} cm` : String(height || "").trim();

  const variantParts = [
    color ? `Color: ${color}` : null,
    size ? `Size: ${size}` : null,
    heightLabel ? `Height: +${heightLabel}` : null,
    material ? `Material: ${material}` : null,
  ].filter(Boolean);

  const variantLineFromCart = variantParts.join(" | ").trim();
  const variantTitleFromServer = String(payError.detail?.variant_title ?? "").trim();
  const variantLineFromServerOptions = buildVariantLineFromOptions(
    payError.detail?.options
  );

  const variantLine =
    variantLineFromCart || variantTitleFromServer || variantLineFromServerOptions || "";

  return {
    title: title || null,
    variantLine: variantLine || null,
    sku: sku || null,
    current: payError.detail?.current,
    requested: payError.detail?.requested,
  };
}

export function mapPayFailure(err: any): PayError {
  const status = Number(err?.status ?? err?.httpStatus ?? 0) || undefined;
  const code = String(err?.code ?? err?.error ?? "").trim();
  const messageFromServer = String(err?.message || "").trim();
  const detail = err?.detail ?? null;

  // 1) Out of stock
  if (
    status === 409 &&
    (code === "out_of_stock" ||
      code === "consume_out_of_stock" ||
      code === "sku_not_found")
  ) {
    const d = detail ?? {};
    const firstItem = Array.isArray(d?.items) ? d.items[0] : null;

    const sku = d?.sku ?? err?.sku ?? firstItem?.sku ?? null;
    const requested = d?.requested ?? err?.requested ?? firstItem?.qty ?? null;
    const current = d?.current ?? err?.current ?? null;

    const product_title = d?.product_title ?? d?.productTitle ?? null;
    const variant_title = d?.variant_title ?? d?.variantTitle ?? null;
    const options = d?.options ?? null;

    return {
      type: "out_of_stock",
      message:
        code === "sku_not_found"
          ? "Sorry — one of the items in your bag is no longer available."
          : "Sorry — the item you’re trying to purchase is out of stock (sold out or not enough quantity).",
      detail: { sku, current, requested, product_title, variant_title, options },
    };
  }

  // 2) Reservation expired
  if (status === 409 && code === "reservation_expired") {
    return {
      type: "reservation_expired",
      status,
      message:
        "Your stock reservation has expired. Please go back to Address and reserve again.",
      detail: detail ?? err ?? null,
    };
  }

  // 3) Reservation failed / conflict
  if (
    (status === 409 || status === 404) &&
    (code.startsWith("reservation_") || code === "reservation_mismatch")
  ) {
    if (code === "reservation_already_consumed") {
      return {
        type: "reservation_failed",
        status: status ?? 409,
        message:
          "We’re confirming your order. If you don’t see a confirmation page, please refresh and check your orders.",
        detail: detail ?? err ?? null,
      };
    }

    if (code === "reservation_not_found") {
      return {
        type: "reservation_failed",
        status: status ?? 404,
        message:
          "We couldn’t find your stock reservation. Please go back to Address and reserve again.",
        detail: detail ?? err ?? null,
      };
    }

    return {
      type: "reservation_failed",
      status: status ?? 409,
      message:
        code === "reservation_mismatch"
          ? "Your bag changed during checkout. Please go back to Address and reserve again."
          : code === "reservation_already_released"
          ? "Your reservation was released. Please go back to Address and reserve again."
          : "We couldn’t confirm your stock reservation. Please go back to Address and reserve again.",
      detail: detail ?? err ?? null,
    };
  }

  // 4) Shipping unavailable / manual review / blocked / exception
  if (
    code === "shipping_manual_review_required" ||
    code === "shipping_blocked_destination" ||
    code === "shipping_quote_exception" ||
    code === "shipping_quote_unavailable"
  ) {
    return {
      type: "shipping_unavailable",
      status,
      message:
        messageFromServer ||
        "Shipping could not be calculated for this address. Please check your postcode or contact support.",
      detail: detail ?? err ?? null,
    };
  }


  // 5) Amount mismatch
  if (status === 400 && code === "amount_mismatch") {
    return {
      type: "amount_mismatch",
      status,
      message:
        "Your order total has changed. Please refresh the page and check out again.",
      detail: detail ?? null,
    };
  }

  // 6) Server error
  if (status && status >= 500) {
    return {
      type: "server_error",
      status,
      message:
        "We couldn’t complete your checkout due to a server issue. Please try again.",
      detail: detail ?? err ?? null,
    };
  }

  // 7) Fallback
  return {
    type: "unknown",
    status,
    message: messageFromServer || "Payment failed. Please try again.",
    detail: detail ?? err ?? null,
  };
}