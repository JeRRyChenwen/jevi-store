// src/app/product/[slug]/page.tsx
import { notFound } from "next/navigation";
import { api, mediaUrl } from "@/lib/strapi";
import GalleryClient from "../_components/GalleryClient";

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

/** 标准化颜色字符串 */
function normalizeColor(s: any) {
  const v = String(s ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  if (v === "gray") return "grey";
  return v;
}

/** 从 product.color_galleries 里取 “颜色 -> 图片数组” */
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

function formatPriceVal(
  n: number | null,
  currency?: string | null,
  locale?: string
) {
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

  const attrs = row?.attributes ?? row ?? {};

  const title: string = attrs.title ?? attrs.name ?? "Product";
  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? cents / 100 : null;
  const currency = (attrs.currency ?? "AUD") as string;

  // 展平所有颜色下的图片（去重，保持顺序）
  const byColor = getImagesByColorFromProduct(attrs);
  const seen = new Set<string>();
  const images: string[] = [];
  for (const k of Object.keys(byColor)) {
    for (const u of byColor[k]) {
      if (!seen.has(u)) {
        seen.add(u);
        images.push(u);
      }
    }
  }
  const total = images.length;

  // 当前选中索引（?img=）
  let selected = 0;
  const rawIdx = Array.isArray(sp.img) ? sp.img[0] : sp.img;
  const n = Number(rawIdx);
  if (Number.isFinite(n) && n >= 0 && n < total) selected = n;

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
      <h1 className="sr-only">{title}</h1>

      {/* 左侧固定宽度（更宽）+ 右侧自适应 */}
      <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] xl:grid-cols-[440px_1fr] gap-10">
        {/* 左侧小画廊：固定在视口顶部下方，避免被遮挡 */}
        <aside className="md:sticky md:top-24 self-start md:pr-6">
          <GalleryClient
            images={images}
            title={title}
            slug={slug}
            selectedIndex={selected}
          />
        </aside>

        {/* 右侧大图 + 信息 */}
        <section>
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
            <p className="mt-2 text-xl font-semibold">
              {formatPriceVal(price, currency)}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
