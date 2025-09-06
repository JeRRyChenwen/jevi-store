// src/app/product/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, mediaUrl } from "@/lib/strapi";

/** Next.js 15: params / searchParams 是 Promise，需要 await */
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: `Product – ${slug}` };
}

/** 与列表页一致的工具：标准化颜色字符串 */
function normalizeColor(s: any) {
  const v = String(s ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (v === "gray") return "grey";
  return v;
}

/** 与列表页一致：从 product.color_galleries 里取 “颜色 -> 图片数组” */
function getImagesByColorFromProduct(attrs: any): Record<string, string[]> {
  const arr: any[] = Array.isArray(attrs?.color_galleries)
    ? attrs.color_galleries
    : Array.isArray(attrs?.color_galleries?.data)
    ? attrs.color_galleries.data
    : [];
  const out: Record<string, string[]> = {};

  for (const cg of arr) {
    const colorRaw = (cg?.color ?? cg?.attributes?.color) as string | undefined;
    const color = normalizeColor(colorRaw);
    if (!color) continue;

    const imgs: any[] = Array.isArray(cg?.images?.data)
      ? cg.images.data
      : Array.isArray(cg?.images)
      ? cg.images
      : [];

    const urls: string[] = [];
    for (const im of imgs) {
      const m = im?.attributes ?? im ?? {};
      const u =
        m?.formats?.large?.url ??
        m?.formats?.medium?.url ??
        m?.formats?.small?.url ??
        m?.formats?.thumbnail?.url ??
        m?.url;
      if (typeof u === "string") urls.push(mediaUrl(u));
    }
    if (urls.length) out[color] = urls;
  }
  return out;
}

function formatPriceVal(n: number | null, currency?: string | null, locale?: string) {
  if (n == null) return "—";
  const cur = (currency || "AUD").toUpperCase();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  // 与列表页一致：只深度 populate color_galleries.images
  const qs =
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=title&fields[1]=slug&fields[2]=base_price_cents&fields[3]=currency` +
    `&fields[4]=discount_percent_off&fields[5]=sale_starts_at&fields[6]=sale_ends_at&fields[7]=hot_score` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][images]=true` +
    `&publicationState=live`;

  console.log("[ProductPage] slug =", slug);
  console.log("[ProductPage] GET", qs);

  const json = await api(qs, { noCache: true });

  const row = json?.data?.[0];
  if (!row) {
    console.log("[ProductPage] not found for slug", slug, "json.data =", json?.data);
    notFound();
  }

  // ★ 关键修复：与列表页一致，兼容被拍平的 attributes
  const attrs = row?.attributes ?? row ?? {};
  console.log("[ProductPage] row keys =", Object.keys(row || {}));
  console.log("[ProductPage] attrs keys =", Object.keys(attrs || {}));
  console.log("[ProductPage] color_galleries type =",
    Array.isArray(attrs?.color_galleries) ? "array" :
    Array.isArray(attrs?.color_galleries?.data) ? "rel.data[]" : typeof attrs?.color_galleries
  );

  const title: string = attrs.title ?? attrs.name ?? "Product";
  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? cents / 100 : null;
  const currency = (attrs.currency ?? "AUD") as string;

  // 解析图片
  const byColor = getImagesByColorFromProduct(attrs);
  console.log("[ProductPage] imagesByColor =", byColor);

  const images: string[] = [];
  for (const k of Object.keys(byColor)) for (const u of byColor[k]) images.push(u);
  const total = images.length;
  console.log("[ProductPage] images total =", total);

  // 当前选中索引（?img=）
  let selected = 0;
  const rawIdx = Array.isArray(sp.img) ? sp.img[0] : sp.img;
  const n = Number(rawIdx);
  if (Number.isFinite(n) && n >= 0 && n < total) selected = n;

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
      <h1 className="sr-only">{title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 左侧缩略图 */}
        <aside className="md:col-span-2">
          <div className="flex md:block gap-3 md:gap-4 overflow-x-auto md:overflow-visible">
            {total > 0 ? (
              images.map((u, i) => {
                const active = i === selected;
                return (
                  <Link
                    key={i}
                    href={`/product/${slug}?img=${i}`}
                    prefetch
                    className={`block rounded-lg border bg-white overflow-hidden w-24 h-24 md:w-[104px] md:h-[104px] shrink-0 ${
                      active ? "ring-2 ring-black" : "hover:shadow"
                    }`}
                    aria-current={active ? "true" : undefined}
                    aria-label={`Preview ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`${title} preview ${i + 1}`} className="w-full h-full object-cover" />
                  </Link>
                );
              })
            ) : (
              <div className="w-24 h-24 md:w-[104px] md:h-[104px] rounded-lg border bg-muted flex items-center justify-center text-xs text-neutral-500">
                No Image
              </div>
            )}
          </div>
        </aside>

        {/* 右侧大图 + 信息 */}
        <section className="md:col-span-10">
          <div className="rounded-3xl border bg-white aspect-[4/3] md:aspect-[5/3] overflow-hidden flex items-center justify-center">
            {total > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={images[selected]}
                src={images[selected]}
                alt={title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-neutral-500">No Image</div>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="mt-2 text-xl font-semibold">{formatPriceVal(price, currency)}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
