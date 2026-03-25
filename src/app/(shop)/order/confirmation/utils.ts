import type { ServerItem, ServerOrder, ServerResp } from "./types";

export function fmtMoneyMinor(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format((Number(minor || 0) || 0) / 100);
}

export function clampMinor(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? (n | 0) : 0;
}

export function isFiniteInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) && Math.floor(n) === n;
}

export function getQty(it: any): number {
  const q = Number(it?.qty ?? 1);
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

export function pickName(it: any) {
  return String(it?.snapshot?.title ?? it?.product_title ?? "Item");
}

export function pickVariant(it: any) {
  const v = it?.snapshot?.variant_title ?? it?.variant_title ?? null;
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

export function pickImage(it: any) {
  const s =
    it?.image_url ??
    it?.snapshot?.image_url ??
    it?.snapshot?.attrs?.image_url ??
    it?.snapshot?.image ??
    null;

  return typeof s === "string" && s.trim() ? s.trim() : null;
}

export function normalizeItems(resp: ServerResp | null): ServerItem[] | null {
  if (!resp || !resp.ok) return null;

  if (Array.isArray(resp.items) && resp.items.length > 0) return resp.items;

  const oi = (resp.order as any)?.items;
  if (Array.isArray(oi) && oi.length > 0) return oi as any;

  return null;
}

export function normalizeAddress(order: ServerOrder | null): any | null {
  if (!order) return null;

  const sj = order.shipping_address_json;
  if (sj && typeof sj === "object") {
    const hasAny =
      sj.firstName ||
      sj.lastName ||
      sj.line1 ||
      sj.city ||
      sj.state ||
      sj.postcode ||
      sj.country;

    if (hasAny) return sj;
  }

  const flat = {
    firstName: (order as any).first_name ?? null,
    lastName: (order as any).last_name ?? null,
    phone: (order as any).phone ?? null,
    email: (order as any).email ?? null,

    line1: (order as any).addr_line1 ?? null,
    line2: (order as any).addr_line2 ?? null,
    city: (order as any).addr_city ?? null,
    state: (order as any).addr_state ?? null,
    postcode: (order as any).addr_postcode ?? null,
    country: (order as any).addr_country ?? null,
  };

  const hasAny =
    flat.firstName ||
    flat.lastName ||
    flat.line1 ||
    flat.city ||
    flat.state ||
    flat.postcode ||
    flat.country;

  return hasAny ? flat : null;
}

export function deriveMoney(order: ServerOrder, items: ServerItem[]) {
  const currency =
    String(order.currency || "")
      .trim()
      .toUpperCase() || "AUD";

  const itemsTotal = isFiniteInt(order.items_total_minor)
    ? clampMinor(order.items_total_minor)
    : items.reduce((sum, it) => sum + clampMinor(it.line_total_minor), 0);

  const totalMinor = isFiniteInt(order.grand_total_minor)
    ? clampMinor(order.grand_total_minor)
    : isFiniteInt(order.total_minor)
    ? clampMinor(order.total_minor)
    : itemsTotal;

  const shippingMinor = isFiniteInt(order.delivery_fee_minor)
    ? clampMinor(order.delivery_fee_minor)
    : Math.max(0, totalMinor - itemsTotal);

  return { currency, itemsTotal, totalMinor, shippingMinor };
}