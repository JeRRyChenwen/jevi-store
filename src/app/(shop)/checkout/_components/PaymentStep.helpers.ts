// src/app/(shop)/checkout/_components/PaymentStep.helpers.ts

export type StockCheckItem = { sku: string; qty: number };

export function getCartSku(it: any): string {
  return String(
    it?.product_sku ?? it?.sku ?? it?.variantSku ?? it?.variant_sku ?? ""
  ).trim();
}

export function buildStockItems(cart: any[]): StockCheckItem[] {
  const list = Array.isArray(cart) ? cart : [];
  const map = new Map<string, number>();

  for (const it of list) {
    const sku = getCartSku(it);
    const qty = Math.max(1, Number(it?.qty) || 1);
    if (!sku) continue;
    map.set(sku, (map.get(sku) ?? 0) + qty);
  }

  return Array.from(map.entries()).map(([sku, qty]) => ({ sku, qty }));
}

export function buildCartHash(items: StockCheckItem[]): string {
  const pairs = (items || [])
    .map(
      (x) =>
        `${String(x.sku).trim()}:${Math.max(1, Math.floor(Number(x.qty) || 1))}`
    )
    .sort();
  return pairs.join("|");
}

export function fmtPrice(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}

export function fmtMoneyMinor(minor: number, currency: string, locale?: string) {
  return fmtPrice((minor ?? 0) / 100, currency, locale);
}

/** 把后端 options 里的 heightIncreaseCm / height_cm / height_increase_cm 统一成人类可读 */
export function buildVariantLineFromOptions(options: any): string {
  const opt = options ?? {};
  const color = String(opt?.color ?? "").trim();
  const size = String(opt?.size ?? "").trim();

  const hRaw =
    opt?.heightIncreaseCm ?? opt?.height_cm ?? opt?.height_increase_cm ?? null;

  let height_cm: number | null = null;
  if (hRaw === 0 || hRaw === "0") height_cm = 0;
  else if (hRaw == null) height_cm = null;
  else if (typeof hRaw === "string" && hRaw.trim() === "") height_cm = null;
  else {
    const n = Number(hRaw);
    height_cm = Number.isFinite(n) ? n : null;
  }

  const parts: string[] = [];
  if (color) parts.push(`Color: ${color}`);
  if (size) parts.push(`Size: ${size}`);
  if (height_cm != null) parts.push(`Height: +${height_cm} cm`);

  return parts.join(" | ");
}

export type PayError =
  | {
      type: "out_of_stock";
      message: string;
      detail?: {
        sku?: string;
        current?: number;
        requested?: number;
        product_title?: string;
        variant_title?: string;
        options?: any;
      };
    }
  | {
      type: "reservation_failed";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "reservation_expired";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "amount_mismatch";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "server_error";
      message: string;
      detail?: any;
      status?: number;
    }
  | {
      type: "unknown";
      message: string;
      detail?: any;
      status?: number;
    };

export function pickCreatedOrderIdFromPayPalPayload(
  payload: any
): number | null {
  const cands = [
    payload?.createdOrderId,
    payload?.order?.order?.id,
    payload?.order?.id,
    payload?.orderId,
    payload?.id,
  ];

  for (const x of cands) {
    const n = Number(x);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}