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

/** 与列表页一致：标准化颜色字符串 */
function normalizeColor(s: any) {
  const v = String(s ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (v === "gray") return "grey";
  return v;
}

/** 从 product.color_galleries 提取 “颜色 -> 图片数组” */
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

  // 只深度 populate color_galleries.images
  const qs =
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=title&fields[1]=slug&fields[2]=base_price_cents&fields[3]=currency` +
    `&fields[4]=discount_percent_off&fields[5]=sale_starts_at&fields[6]=sale_ends_at&fields[7]=hot_score` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][images]=true` +
    `&publicationState=live`;

  const json = await api(qs, { noCache: true });
  const row = json?.data?.[0];
  if (!row) notFound();

  // 兼容被拍平的 attributes
  const attrs = row?.attributes ?? row ?? {};

  const title: string = attrs.title ?? attrs.name ?? "Product";
  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? cents / 100 : null;
  const currency = (attrs.currency ?? "AUD") as string;

  // 拍平所有图片（保持顺序、去重）
  const byColor = getImagesByColorFromProduct(attrs);
  const seen = new Set<string>();
  const images: string[] = [];
  for (const k of Object.keys(byColor)) {
    for (const u of byColor[k]) {
      if (!seen.has(u)) {
        images.push(u);
        seen.add(u);
      }
    }
  }

  // 当前选中索引（?img=）
  const rawIdx = Array.isArray(sp?.img) ? sp!.img[0] : sp?.img;
  const imgIdx = Math.max(
    0,
    Math.min(images.length - 1, Number.isFinite(Number(rawIdx)) ? Number(rawIdx) : 0)
  );

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
      <h1 className="sr-only">{title}</h1>

      {/* 画廊：左侧竖向缩略图 + 右侧大图（纯服务端版，无需 hooks） */}
      <div className="grid gap-6 md:grid-cols-[106px,1fr]">
        {/* 左：缩略图列（sticky + 独立滚动，不重叠） */}
        <aside>
          <div className="md:sticky md:top-24 md:max-h-[72vh] overflow-y-auto pr-1">
            <div className="flex md:flex-col gap-3">
              {images.length > 0 ? (
                images.map((src, i) => {
                  const selected = i === imgIdx;
                  return (
                    <Link
                      key={src + i}
                      href={`/product/${slug}?img=${i}`}
                      prefetch
                      aria-label={`Preview ${i + 1}`}
                      aria-current={selected ? "true" : undefined}
                      className={[
                        "relative w-20 h-20 md:w-[96px] md:h-[96px] shrink-0 rounded-xl overflow-hidden",
                        "border bg-white hover:shadow-sm transition",
                        selected
                          ? "ring-2 ring-black"
                          : "ring-1 ring-transparent hover:ring-black/20",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`${title} thumbnail ${i + 1}`} className="h-full w-full object-cover" />
                    </Link>
                  );
                })
              ) : (
                <div className="w-20 h-20 md:w-[96px] md:h-[96px] rounded-xl border bg-neutral-100 flex items-center justify-center text-xs text-neutral-500">
                  No Image
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* 右：主图卡片 + 基本信息 */}
        <section>
          <div className="relative rounded-3xl border bg-neutral-100 aspect-[4/5] md:aspect-[5/4] overflow-hidden group">
            {images.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={images[imgIdx]}
                src={images[imgIdx]}
                alt={title}
                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
                No Image
              </div>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-lg md:text-xl font-semibold text-neutral-800">
              {formatPriceVal(price, currency)}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
