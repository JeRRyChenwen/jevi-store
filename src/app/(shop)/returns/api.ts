// src/app/(shop)/returns/api.ts

import { api } from "@/lib/strapi";
import type { ReturnsBootstrapResp, SelectedImg } from "./types";
import { firstImageUrlFromRel } from "./utils";
import type { ReturnOrderDetail } from "./_components/ReturnItemsSelector";

export async function fetchReturnsBootstrap(): Promise<ReturnsBootstrapResp> {
  const res = await fetch(`/api/returns/bootstrap`, {
    credentials: "include",
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as ReturnsBootstrapResp;
  return data;
}

export async function lookupReturnOrder(orderNumber: string, email: string): Promise<{
  status: number;
  data: any;
  retryAfterSec: number;
}> {
  const res = await fetch(
    `/api/returns/lookup?order_number=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(
      email
    )}`,
    {
      credentials: "include",
      cache: "no-store",
    }
  );

  const data = await res.json().catch(() => ({} as any));

  const retryAfterHeader = res.headers.get("retry-after");
  const retryAfterFromHeader = retryAfterHeader ? Number(retryAfterHeader) : 0;
  const retryAfterFromBody = Number(data?.retry_after_sec ?? 0);

  const retryAfterSec =
    (Number.isFinite(retryAfterFromBody) && retryAfterFromBody > 0
      ? retryAfterFromBody
      : 0) ||
    (Number.isFinite(retryAfterFromHeader) && retryAfterFromHeader > 0
      ? retryAfterFromHeader
      : 0);

  return {
    status: res.status,
    data,
    retryAfterSec,
  };
}

export async function fetchThumbsByOrderItems(
  order: ReturnOrderDetail
): Promise<Record<number, string | null>> {
  const items = Array.isArray(order?.items) ? order.items : [];

  const titles = Array.from(
    new Set(
      items
        .map((it: any) => String(it?.product_title || "").trim())
        .filter((s: string) => !!s)
    )
  );

  if (!titles.length) return {};

  const p = new URLSearchParams();
  titles.forEach((t, i) => {
    p.append(`filters[$or][${i}][title][$eqi]`, t);
  });

  p.append("fields[0]", "title");
  p.append("fields[1]", "slug");
  p.append("publicationState", "live");
  p.append("populate[color_galleries][populate][images]", "true");

  const qs = `/api/products?${p.toString()}`;

  const strapiRes: any = await api(qs, { noCache: true });
  const products: any[] = strapiRes?.data ?? [];

  const productIndex: Record<
    string,
    { def: string | null; colors: Record<string, string> }
  > = {};

  for (const row of products) {
    const attrs = row?.attributes ?? row;
    const title = String(attrs?.title ?? "").trim();
    if (!title) continue;

    const galleries = Array.isArray(attrs?.color_galleries)
      ? attrs.color_galleries
      : Array.isArray(attrs?.color_gallery)
      ? attrs.color_gallery
      : [];

    const colors: Record<string, string> = {};
    let def: string | null = null;

    for (const g of galleries) {
      const c = String(g?.color ?? "").trim().toLowerCase();
      const u = firstImageUrlFromRel(g?.images as any);

      if (!def && u) def = u;
      if (c && u) colors[c] = u;
    }

    if (!def) {
      for (const g of galleries) {
        const u = firstImageUrlFromRel(g?.images as any);
        if (u) {
          def = u;
          break;
        }
      }
    }

    productIndex[title.toLowerCase()] = { def, colors };
  }

  const nextThumb: Record<number, string | null> = {};
  for (const it of items as any[]) {
    const itemId = Number(it?.id);
    if (!Number.isFinite(itemId) || itemId <= 0) continue;

    const t = String(it?.product_title || "").trim().toLowerCase();
    const idx = t ? productIndex[t] : null;

    const rawVariant = String(it?.variant_title ?? "");
    const color = rawVariant.split("/")[0]?.trim().toLowerCase();

    nextThumb[itemId] =
      color && idx?.colors?.[color] ? idx.colors[color] : idx?.def ?? null;
  }

  return nextThumb;
}

export async function uploadReturnAttachments(
  returnId: number,
  images: SelectedImg[]
): Promise<any> {
  if (!images.length) return null;

  const fd = new FormData();
  for (const img of images) {
    fd.append("files", img.file);
  }

  const res = await fetch(`/api/returns/${returnId}/attachments`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok || !data?.ok) {
    throw new Error(String(data?.error || "upload_failed"));
  }

  return data;
}

export async function submitReturnRequest(payload: {
  order_number: string | number;
  reason_type: string;
  reason_detail: string;
  items: Array<{ order_item_id: number; qty: number }>;
  email: string;
}): Promise<{
  status: number;
  data: any;
}> {
  const res = await fetch("/api/returns", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({} as any));

  return {
    status: res.status,
    data,
  };
}