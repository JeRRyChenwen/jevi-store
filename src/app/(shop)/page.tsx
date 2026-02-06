// src/app/(shop)/page.tsx
import Link from "next/link";
import HomeProductCard from "@/components/home/HomeProductCard";
import {
  mediaUrl,
  api,
  fetchTopLevelCategoryDocIdMap,
  fetchSubcategoriesByParentId,
} from "@/lib/strapi";

export const revalidate = 0;

const HOME_SECTIONS = [
  { slug: "shoes", title: "Shoes" },
  { slug: "bottoms", title: "Bottoms" },
  { slug: "tops", title: "Tops" },
  { slug: "suit", title: "Suit" },
  { slug: "accessories", title: "Accessories" },
  { slug: "outfit", title: "Outfit" },
];

function formatMoneyMinor(minor: number, currency: string) {
  const cur = (currency || "AUD").toUpperCase();
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cur,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

/**
 * ✅ prices 组件（minor-only）
 * - price / real_price 都是整数 minor（分）
 * - amount_minor 旧字段兼容
 */
function pickPriceTextsFromPrices(prices: any[], displayCurrency = "AUD") {
  const want = displayCurrency.toUpperCase();

  const rec =
    prices.find(
      (p) =>
        String(p?.currency ?? p?.attributes?.currency ?? "").toUpperCase() === want
    ) ?? prices[0];

  const a = rec?.attributes ?? rec ?? {};
  const currency = String(a.currency ?? displayCurrency).toUpperCase();

  const baseMinor = Number.isFinite(Number(a.price))
    ? Math.round(Number(a.price))
    : Number.isFinite(Number(a.amount_minor))
    ? Math.round(Number(a.amount_minor))
    : null;

  const effMinor = Number.isFinite(Number(a.real_price))
    ? Math.round(Number(a.real_price))
    : baseMinor;

  if (baseMinor == null) {
    return {
      priceText: "No price",
      saleText: null as string | null,
      discountPct: null as number | null,
    };
  }

  const priceText = formatMoneyMinor(baseMinor, currency);

  if (effMinor != null && effMinor > 0 && effMinor < baseMinor) {
    const saleText = formatMoneyMinor(effMinor, currency);
    const discountPct = Math.round((1 - effMinor / baseMinor) * 100);
    return { priceText, saleText, discountPct };
  }

  return { priceText, saleText: null, discountPct: null };
}

/**
 * ✅ PDP 同款：从 color_galleries -> images 里取第一张图
 */
function pickFirstImageFromColorGalleries(attrs: any): string | null {
  const arr: any[] = Array.isArray(attrs?.color_galleries)
    ? attrs.color_galleries
    : Array.isArray(attrs?.color_galleries?.data)
    ? attrs.color_galleries.data
    : [];

  for (const cg of arr) {
    const images: any[] = Array.isArray(cg?.images?.data)
      ? cg.images.data
      : Array.isArray(cg?.images)
      ? cg.images
      : [];

    for (const im of images) {
      const m = im?.attributes ?? im ?? {};
      const u =
        m?.formats?.large?.url ??
        m?.formats?.medium?.url ??
        m?.formats?.small?.url ??
        m?.formats?.thumbnail?.url ??
        m?.url ??
        null;

      if (typeof u === "string" && u) return mediaUrl(u);
    }
  }

  return null;
}

async function queryHotProductsByCategoryDocIds(docIds: string[], limit = 6) {
  const inPart = docIds
    .map(
      (id, i) =>
        `filters[category][documentId][$in][${i}]=${encodeURIComponent(id)}`
    )
    .join("&");

  // ✅ 不用 cover（你 schema 里没有 cover 就会 400）
  // ✅ 改用 PDP 同款：color_galleries 的第一张图
  const qs =
    `/api/products?${inPart}` +
    `&pagination[page]=1&pagination[pageSize]=${limit}` +
    `&sort[0]=hot_score:desc&sort[1]=priority:asc&sort[2]=updatedAt:desc` +
    `&publicationState=live` +
    `&fields[0]=title&fields[1]=slug&fields[2]=hot_score&fields[3]=priority` +
    `&populate[prices]=*` +
    `&populate[color_galleries][fields][0]=color` +
    `&populate[color_galleries][populate][images]=true`;

  return api(qs, { noCache: true });
}

function Section({
  title,
  slug,
  cards,
}: {
  title: string;
  slug: string;
  cards: any[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Top picks based on hot score
          </p>
        </div>

        <Link
          href={`/category/${slug}`}
          className="text-sm font-medium underline underline-offset-4"
        >
          View all
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          No products yet.
        </div>
      ) : (
        <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
          {cards.map((c: any) => (
            <HomeProductCard key={c.slug} {...c} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * ✅ 恢复“首页原本的上半部分内容”（Hero/Banner 网格）
 * - 这里做成纯展示，不依赖你之前的 SIDE_LEFT 等常量
 * - 不传任何 function 给 Client Component（避免你之前那个报错）
 * - 你后面要换成真实图片/跳转，只改这里的文案/链接就行
 */
function HomeHeroSection() {
  return (
    <section className="px-4 md:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left tall promo */}
        <Link
          href="/category/shoes"
          className="
            lg:col-span-3
            rounded-3xl border bg-white overflow-hidden
            hover:shadow-md transition
            min-h-[320px] lg:min-h-[520px]
            flex flex-col justify-end
          "
        >
          <div className="p-5 space-y-2">
            <div className="text-xs font-semibold tracking-wide text-neutral-500">
              CLEARANCE
            </div>
            <div className="text-3xl font-bold leading-tight">
              Extra <span className="text-emerald-700">20%</span> Off
            </div>
            <div className="text-sm text-neutral-500">
              End-of-season deals you can’t miss
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium">
                Shop clearance →
              </span>
            </div>
          </div>
        </Link>

        {/* Middle placeholder (you can replace with image later) */}
        <div
          className="
            lg:col-span-5
            rounded-3xl border bg-gradient-to-b from-neutral-100 to-neutral-200
            min-h-[320px] lg:min-h-[520px]
          "
        />

        {/* Right big visual placeholder */}
        <Link
          href="/category/tops"
          className="
            lg:col-span-4
            rounded-3xl border bg-gradient-to-b from-neutral-100 to-neutral-200
            min-h-[320px] lg:min-h-[520px]
            hover:shadow-md transition
            relative overflow-hidden
          "
        >
          <div className="absolute inset-0" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="text-xl font-semibold">Trending picks</div>
            <div className="text-sm text-neutral-600">Tap to explore</div>
          </div>
        </Link>

        {/* Bottom left */}
        <Link
          href="/category/outfit"
          className="
            lg:col-span-6
            rounded-3xl border bg-gradient-to-b from-neutral-50 to-neutral-100
            min-h-[220px]
            hover:shadow-md transition
            p-6 flex flex-col justify-center
          "
        >
          <div className="text-xs font-semibold text-neutral-500">25–30% OFF</div>
          <div className="text-3xl font-bold mt-2">Women’s Fashion</div>
          <div className="text-sm text-neutral-500 mt-2">
            Levi&apos;s, Regatta, Tokito, Calvin Klein and more
          </div>
          <div className="pt-4">
            <span className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium">
              Shop women →
            </span>
          </div>
        </Link>

        {/* Bottom right */}
        <Link
          href="/category/accessories"
          className="
            lg:col-span-6
            rounded-3xl border bg-gradient-to-b from-neutral-50 to-neutral-100
            min-h-[220px]
            hover:shadow-md transition
            p-6 flex flex-col justify-center
          "
        >
          <div className="text-xs font-semibold text-neutral-500">40% OFF</div>
          <div className="text-3xl font-bold mt-2">Homewares</div>
          <div className="text-sm text-neutral-500 mt-2">
            Bedding, dining, home décor and more
          </div>
          <div className="pt-4">
            <span className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium">
              Shop home →
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const topMap = await fetchTopLevelCategoryDocIdMap();

  const sections = await Promise.all(
    HOME_SECTIONS.map(async (sec) => {
      try {
        const topDocId = topMap[sec.slug];
        if (!topDocId) return { ...sec, cards: [] };

        const children = await fetchSubcategoriesByParentId(topDocId);
        const childIds = children.map((c) => c.documentId).filter(Boolean);
        const docIds = [topDocId, ...childIds];

        const json: any = await queryHotProductsByCategoryDocIds(docIds, 6);
        const rows: any[] = json?.data ?? [];

        const cards = rows
          .map((r) => {
            const attrs = r?.attributes ?? r ?? {};

            const slug = String(attrs.slug ?? r.slug ?? "");
            const title = String(attrs.title ?? attrs.name ?? "Product");

            const pricesArr = Array.isArray(attrs?.prices)
              ? attrs.prices
              : Array.isArray(attrs?.prices?.data)
              ? attrs.prices.data
              : [];

            const { priceText, saleText, discountPct } =
              pickPriceTextsFromPrices(pricesArr, "AUD");

            const imageUrl = pickFirstImageFromColorGalleries(attrs);

            return {
              slug,
              title,
              imageUrl,
              priceText,
              saleText,
              discountPct,
              hotScore: attrs.hot_score ?? attrs.hotScore ?? null,
            };
          })
          .filter((x) => x.slug);

        console.log(`[home] ${sec.slug} rows=${rows.length} cards=${cards.length}`);
        return { ...sec, cards };
      } catch (e: any) {
        console.error("[home] section failed:", sec.slug, e?.message || e);
        return { ...sec, cards: [] };
      }
    })
  );

  return (
    <main className="w-full max-w-none pt-2 md:pt-3 pb-10 space-y-10">
      {/* ✅ 原本首页上半部分内容：恢复 */}
      <HomeHeroSection />

      {/* ✅ 分类区块：保留你已跑通的逻辑 */}
      <div className="px-4 md:px-6 lg:px-8 space-y-12">
        {sections.map((s) => (
          <Section key={s.slug} title={s.title} slug={s.slug} cards={s.cards} />
        ))}
      </div>
    </main>
  );
}
