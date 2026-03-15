import { api } from "@/lib/strapi";
import { firstImageUrlFromRel } from "./utils";

export async function loadReturnItemThumbs(
  items: any[]
): Promise<Record<number, string | null>> {
  const safeItems = Array.isArray(items) ? items : [];

  const titles = Array.from(
    new Set(
      safeItems
        .map((it: any) => String(it?.product_title || "").trim())
        .filter((s: string) => !!s)
    )
  );

  if (!titles.length) {
    return {};
  }

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

  for (const it of safeItems) {
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