// src/app/product/[slug]/page.tsx
import { api, mediaUrl } from "@/lib/strapi";

/** Next.js 15：params / searchParams 是 Promise，需要 await */
type PageProps = {
  params: Promise<{ slug: string }>;
};

// 可选：关闭缓存，开发期更直观
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params; // ★ 必须 await
  return {
    title: `Product – ${slug}`,
  };
}

/** 取 color_galleries 的第一张图 */
function firstImageFromColorGalleries(attrs: any): string | undefined {
  const galleries: any[] = Array.isArray(attrs?.color_galleries)
    ? attrs.color_galleries
    : [];

  for (const cg of galleries) {
    const imgs: any[] = Array.isArray(cg?.images?.data)
      ? cg.images.data
      : Array.isArray(cg?.images)
      ? cg.images
      : [];
    for (const im of imgs) {
      const m = im?.attributes ?? im ?? {};
      const u =
        m?.formats?.large?.url ??
        m?.formats?.medium?.url ??
        m?.formats?.small?.url ??
        m?.formats?.thumbnail?.url ??
        m?.url;
      if (typeof u === "string") return mediaUrl(u);
    }
  }
  return undefined;
}

function formatPriceVal(n: number | null, currency?: string | null, locale?: string) {
  if (n == null) return "—";
  const cur = (currency || "AUD").toUpperCase();
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    currencyDisplay: "code", // 避免 USD 显示缺字
    maximumFractionDigits: 2,
  }).format(Number(n));
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params; // ★ 必须 await

  // 拉取该 slug 的商品
  const qs =
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    `&fields[0]=title&fields[1]=slug&fields[2]=base_price_cents&fields[3]=currency` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][images]=true` +
    `&publicationState=live`;

  const json = await api(qs, { noCache: true });
  const row = json?.data?.[0];
  const attrs = row?.attributes ?? {};

  const title = attrs.title ?? "Product";
  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? cents / 100 : null;
  const currency = (attrs.currency ?? "AUD") as string;
  const cover = firstImageFromColorGalleries(attrs);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* 图 */}
      <div className="rounded-3xl border bg-muted aspect-square overflow-hidden flex items-center justify-center">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="text-neutral-500">No Image</div>
        )}
      </div>

      {/* 文本 */}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-2 text-neutral-500 text-sm">
          Slug: <code className="font-mono">{slug}</code>
        </div>
        <div className="mt-6 text-xl font-semibold">
          {formatPriceVal(price, currency)}
        </div>
      </div>
    </main>
  );
}
