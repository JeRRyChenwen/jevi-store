// src/app/category/[slug]/CategoryGridClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination/Pagination";
import { api, mediaUrl } from "@/lib/strapi";

type Props = {
  slug: string;
  title: string;
  total: number;
  pageSize?: number;
  /** 顶级分类 = 自身 + 子分类 documentId，用于 $in 过滤 */
  categoryDocIds?: string[];
};

type ProductLite = {
  key: string;
  name: string;
  price: number | null; // 元（由 base_price_cents / 100 换算）
  currency?: string | null;
  imageUrl?: string;
};

// dev-only 日志（生产环境不打印）
const DEV = process.env.NODE_ENV !== "production";
function debug(...args: unknown[]) {
  if (DEV) console.debug(...args);
}

/** 从 Multiple Media 的 gallery 中稳健地取第一张图片 URL */
function getFirstGalleryUrl(attrs: any): string | undefined {
  // 统一拿到第 1 个媒体节点（支持 data: [], data: {}, 或直接是数组）
  const raw = Array.isArray(attrs?.gallery?.data)
    ? attrs.gallery.data[0]
    : attrs?.gallery?.data ??
      (Array.isArray(attrs?.gallery) ? attrs.gallery[0] : undefined);

  const media = raw?.attributes ?? raw ?? {};
  // 优先从 formats 中取合适尺寸，再退回到顶层 url
  const candidateUrl: unknown =
    media?.formats?.medium?.url ??
    media?.formats?.large?.url ??
    media?.formats?.small?.url ??
    media?.formats?.thumbnail?.url ??
    media?.url;

  const url = typeof candidateUrl === "string" ? candidateUrl : undefined;

  debug("[Grid:getFirstGalleryUrl] media =", media);
  debug("[Grid:getFirstGalleryUrl] picked url =", url);

  return url ? mediaUrl(url) : undefined;
}

function normalizeProduct(row: any): ProductLite {
  const attrs = row?.attributes ?? row ?? {};
  const name: string = attrs.title ?? attrs.name ?? attrs.slug ?? "Product";

  const cents = Number(attrs.base_price_cents);
  const price = Number.isFinite(cents) ? Math.max(0, cents) / 100 : null;
  const currency: string | undefined = (attrs.currency ?? "USD") as string;

  const imageUrl = getFirstGalleryUrl(attrs);

  const key =
    String(row?.id ?? "") ||
    String(attrs.documentId ?? "") ||
    String(attrs.slug ?? "") ||
    `${name}-${Math.random().toString(36).slice(2)}`;

  return { key, name, price, currency, imageUrl };
}

function CardSkeleton() {
  return (
    <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="p-6 md:p-8 space-y-3">
        <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-8 w-24 rounded bg-muted animate-pulse" />
      </div>
    </article>
  );
}

export default function CategoryGridClient({
  slug,
  title,
  total,
  pageSize = 40,
  categoryDocIds,
}: Props) {
  const sp = useSearchParams();
  const pageParam = sp.get("page");
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // 当前页（校正到 1..pageCount）
  const page = (() => {
    const n = Number(pageParam ?? "1");
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, pageCount);
  })();

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ProductLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 结果数量文案
  const resultLabel = useMemo(
    () => `${total} ${total === 1 ? "result" : "results"}`,
    [total]
  );

  // 拉取当前页产品
  useEffect(() => {
    let aborted = false;

    async function run() {
      if (total === 0) {
        setList([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // v5 稳妥的 $in 写法：filters[...][$in][0]=a&filters[...][$in][1]=b
        const filterPart = categoryDocIds?.length
          ? categoryDocIds
              .map(
                (id, i) =>
                  `filters[category][documentId][$in][${i}]=${encodeURIComponent(id)}`
              )
              .join("&")
          : `filters[category][slug][$eq]=${encodeURIComponent(slug)}`;

        // 只展开 product.gallery
        const qs =
          `/api/products?` +
          `${filterPart}` +
          `&populate[gallery]=true` +
          `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
          `&sort[0]=updatedAt:desc` +
          `&publicationState=live`;

        debug("[Grid:fetch] QS =", qs);
        debug("[Grid:fetch] slug =", slug, "docIds =", categoryDocIds);

        const json: any = await api(qs, { noCache: true });

        debug("[Grid:fetch] meta =", json?.meta);
        const rows: any[] = Array.isArray(json?.data) ? json.data : [];
        const first: any = rows[0];
        debug("[Grid:fetch] first item =", first);
        debug("[Grid:fetch] first gallery =", first?.attributes?.gallery);

        const mapped = rows.map(normalizeProduct);

        debug(
          "[Grid:fetch] mapped:",
          mapped.map((m, i) => ({
            i,
            name: m.name,
            imageUrl: m.imageUrl,
            price: m.price,
            currency: m.currency,
          }))
        );

        if (!aborted) setList(mapped);
      } catch (e: unknown) {
        const msg =
          (e as Error)?.message ??
          (typeof e === "string" ? e : "Failed to load products");
        if (!aborted) {
          setError(msg);
          setList([]);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    void run();
    return () => {
      aborted = true;
    };
  }, [slug, categoryDocIds, page, pageSize, total]);

  const start = (page - 1) * pageSize;
  const hrefForPage = useMemo(
    () => (p: number) => `/category/${slug}?page=${p}`,
    [slug]
  );

  const formatPrice = (price: number | null, currency?: string | null) => {
    if (price == null) return "$129";
    const cur = (currency || "USD").toUpperCase();
    return cur === "USD" ? `$${price}` : `${price} ${cur}`;
  };

  return (
    <>
      <header className="mb-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-neutral-600">
              Category: <code className="font-mono">{slug}</code>
            </p>
          </div>
          <div className="text-sm md:text-base text-neutral-600 whitespace-nowrap">
            {resultLabel}
          </div>
        </div>
      </header>

      {error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : loading ? (
        <section>
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {Array.from({ length: Math.min(pageSize, total - start) || 8 }).map(
              (_, i) => (
                <CardSkeleton key={i} />
              )
            )}
          </div>
        </section>
      ) : list.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No products yet.
        </div>
      ) : (
        <section>
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {list.map((p, idx) => (
              <article
                key={p.key}
                className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="aspect-[4/3] bg-muted">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={p.name}
                      src={p.imageUrl}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      Image #{start + idx + 1}
                    </div>
                  )}
                </div>

                <div className="p-6 md:p-8">
                  <h3 className="text-lg md:text-xl font-semibold line-clamp-1">
                    {p.name || `Product #${start + idx + 1}`}
                  </h3>
                  <p className="mt-1 text-sm md:text-base text-muted-foreground line-clamp-2">
                    Short description goes here…
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xl md:text-2xl font-bold">
                      {formatPrice(p.price, p.currency)}
                    </span>
                    <button className="rounded-full px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base bg-primary text-primary-foreground transition-opacity hover:opacity-90">
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefForPage={hrefForPage}
        className="mb-10"
      />
    </>
  );
}
