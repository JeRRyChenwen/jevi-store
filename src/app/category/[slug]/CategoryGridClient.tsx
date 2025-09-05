// src/app/category/[slug]/CategoryGridClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "@/components/pagination/Pagination";
import { api, mediaUrl } from "@/lib/strapi";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  slug: string;
  title: string;
  /** 初始总数（未筛选）。应用筛选后会用接口返回的 filteredTotal 覆盖 */
  total: number;
  pageSize?: number;
  /** 顶级分类 = 自身 + 子分类 documentId，用于 $in 过滤 */
  categoryDocIds?: string[];
};

type ProductLite = {
  key: string;
  name: string;
  price: number | null;
  currency?: string | null;
  imageUrl?: string;
};

const DEV = process.env.NODE_ENV !== "production";
const dbg = (...args: unknown[]) => DEV && console.debug("[Grid]", ...args);

// ---------- helpers ----------
const toCents = (n?: number | null) =>
  typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) : undefined;

function parseCSV(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key)?.trim() || "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getFirstGalleryUrl(attrs: any): string | undefined {
  const raw = Array.isArray(attrs?.gallery?.data)
    ? attrs.gallery.data[0]
    : attrs?.gallery?.data ?? (Array.isArray(attrs?.gallery) ? attrs.gallery[0] : undefined);
  const media = raw?.attributes ?? raw ?? {};
  const u =
    media?.formats?.medium?.url ??
    media?.formats?.large?.url ??
    media?.formats?.small?.url ??
    media?.formats?.thumbnail?.url ??
    media?.url;
  return typeof u === "string" ? mediaUrl(u) : undefined;
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

// ============ Main ============
export default function CategoryGridClient({
  slug,
  title,
  total,
  pageSize = 40,
  categoryDocIds,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  // === Refs：无障碍焦点管理 ===
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // 已应用的筛选（来自 URL）
  const minParam = sp.get("min");
  const maxParam = sp.get("max");
  const appliedMin = useMemo(
    () => (minParam ? Math.max(0, Number(minParam)) : undefined),
    [minParam]
  );
  const appliedMax = useMemo(
    () => (maxParam ? Math.max(0, Number(maxParam)) : undefined),
    [maxParam]
  );
  const appliedMaterials = useMemo(() => parseCSV(sp, "material"), [sp]);
  const appliedSizes = useMemo(() => parseCSV(sp, "size"), [sp]);
  const appliedColors = useMemo(() => parseCSV(sp, "color"), [sp]);
  const appliedGenders = useMemo(() => parseCSV(sp, "gender"), [sp]); // product 级别

  // 分页（基于筛选后的总数）
  const pageParam = sp.get("page");
  const [filteredTotal, setFilteredTotal] = useState<number>(total);
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const page = (() => {
    const n = Number(pageParam ?? "1");
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, pageCount);
  })();

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ProductLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Facets
  const [facetMaterials, setFacetMaterials] = useState<string[]>([]);
  const [facetSizes, setFacetSizes] = useState<string[]>([]);
  const [facetColors, setFacetColors] = useState<string[]>([]);
  const [facetGenders, setFacetGenders] = useState<string[]>([]);
  const [variantFiltersSupported, setVariantFiltersSupported] = useState(true);
  const [productGenderSupported, setProductGenderSupported] = useState(true);

  // Drawer 草稿值
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState<number | undefined>(appliedMin);
  const [draftMax, setDraftMax] = useState<number | undefined>(appliedMax);
  const [draftMaterials, setDraftMaterials] = useState<Set<string>>(
    new Set(appliedMaterials)
  );
  const [draftSizes, setDraftSizes] = useState<Set<string>>(new Set(appliedSizes));
  const [draftColors, setDraftColors] = useState<Set<string>>(new Set(appliedColors));
  const [draftGenders, setDraftGenders] = useState<Set<string>>(new Set(appliedGenders));

  // 打开抽屉时，用已应用的筛选值重置草稿
  useEffect(() => {
    if (open) {
      setDraftMin(appliedMin);
      setDraftMax(appliedMax);
      setDraftMaterials(new Set(appliedMaterials));
      setDraftSizes(new Set(appliedSizes));
      setDraftColors(new Set(appliedColors));
      setDraftGenders(new Set(appliedGenders));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 打开后把焦点放到 Close；Esc 关闭并把焦点还给 Filter
  useEffect(() => {
    if (!open) return;
    setTimeout(() => closeBtnRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement | null)?.blur?.();
        setOpen(false);
        setTimeout(() => triggerBtnRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 拉 facets：variants(size/color/material) + product(gender)
  useEffect(() => {
    let aborted = false;
    async function fetchFacets() {
      const partsForProducts: string[] = [];
      const partsForVariants: string[] = [];
      if (categoryDocIds?.length) {
        categoryDocIds.forEach((id, i) => {
          const enc = encodeURIComponent(id);
          partsForProducts.push(`filters[category][documentId][$in][${i}]=${enc}`);
          partsForVariants.push(`filters[product][category][documentId][$in][${i}]=${enc}`);
        });
      } else {
        const enc = encodeURIComponent(slug);
        partsForProducts.push(`filters[category][slug][$eq]=${enc}`);
        partsForVariants.push(`filters[product][category][slug][$eq]=${enc}`);
      }
      // 仅统计/展示「被上架显示」的商品
      partsForProducts.push(`filters[is_showed][$eq]=true`);
      partsForVariants.push(`filters[product][is_showed][$eq]=true`);

      try {
        // variants -> size/color/material
        const qsV =
          `/api/variants?${partsForVariants.join("&")}` +
          `&fields[0]=material&fields[1]=size&fields[2]=color` +
          `&pagination[pageSize]=500&publicationState=live`;
        dbg("facets:variants GET", qsV);

        const [vJson, pJson] = await Promise.all([
          api(qsV, { noCache: true }).catch((e) => {
            dbg("facets:variants error", e?.message || e);
            setVariantFiltersSupported(false);
            return null;
          }),
          // products -> gender（product 级别）
          api(
            `/api/products?${partsForProducts.join("&")}` +
              `&fields[0]=gender&pagination[pageSize]=500&publicationState=live`,
            { noCache: true }
          ).catch((e) => {
            dbg("facets:products(gender) error", e?.message || e);
            setProductGenderSupported(false);
            return null;
          }),
        ]);

        if (!aborted && vJson) {
          const rows: any[] = Array.isArray(vJson?.data) ? vJson.data : [];
          const m = new Set<string>();
          const s = new Set<string>();
          const c = new Set<string>();
          for (const r of rows) {
            const a = r?.attributes ?? r ?? {};
            if (a.material && String(a.material).trim()) m.add(String(a.material).trim());
            if (a.size && String(a.size).trim()) s.add(String(a.size).trim());
            if (a.color && String(a.color).trim()) c.add(String(a.color).trim());
          }
          setFacetMaterials(Array.from(m).sort((a, b) => a.localeCompare(b)));
          setFacetSizes(Array.from(s).sort((a, b) => a.localeCompare(b)));
          setFacetColors(Array.from(c).sort((a, b) => a.localeCompare(b)));
        }

        if (!aborted && pJson) {
          const rows: any[] = Array.isArray(pJson?.data) ? pJson.data : [];
          const g = new Set<string>();
          for (const r of rows) {
            const a = r?.attributes ?? r ?? {};
            const v = a.gender;
            if (v && String(v).trim()) g.add(String(v).trim());
          }
          setFacetGenders(Array.from(g).sort((a, b) => a.localeCompare(b)));
        }
      } catch {
        /* 已在各自 catch 里处理 */
      }
    }
    fetchFacets();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, JSON.stringify(categoryDocIds)]);

  // 拉取产品（按筛选+分页）
  useEffect(() => {
    let aborted = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const parts: string[] = [];
        // 分类
        if (categoryDocIds?.length) {
          categoryDocIds.forEach((id, i) =>
            parts.push(`filters[category][documentId][$in][${i}]=${encodeURIComponent(id)}`)
          );
        } else {
          parts.push(`filters[category][slug][$eq]=${encodeURIComponent(slug)}`);
        }

        // 仅展示「被上架显示」的商品
        parts.push(`filters[is_showed][$eq]=true`);

        // 价格（元→分）
        const minCents = toCents(appliedMin);
        const maxCents = toCents(appliedMax);
        if (typeof minCents === "number")
          parts.push(`filters[base_price_cents][$gte]=${minCents}`);
        if (typeof maxCents === "number")
          parts.push(`filters[base_price_cents][$lte]=${maxCents}`);

        // product 级（gender）
        if (productGenderSupported && appliedGenders.length) {
          appliedGenders.forEach((v, i) =>
            parts.push(`filters[gender][$in][${i}]=${encodeURIComponent(v)}`)
          );
        }

        // variant 级（material / size / color）
        if (variantFiltersSupported) {
          const pushIN = (key: string, arr: string[]) => {
            arr.forEach((v, i) =>
              parts.push(`filters[variants][${key}][$in][${i}]=${encodeURIComponent(v)}`)
            );
          };
          if (appliedMaterials.length) pushIN("material", appliedMaterials);
          if (appliedSizes.length) pushIN("size", appliedSizes);
          if (appliedColors.length) pushIN("color", appliedColors);
        }

        const qs =
          `/api/products?${parts.join("&")}` +
          `&populate[gallery]=true` +
          `&pagination[page]=${page}&pagination[pageSize]=${pageSize}` +
          `&sort[0]=updatedAt:desc&publicationState=live`;

        dbg("products:GET", qs);

        const json = await api(qs, { noCache: true });
        const rows: any[] = Array.isArray(json?.data) ? json.data : [];
        const totalMeta = Number(json?.meta?.pagination?.total ?? 0);

        if (!aborted) {
          setFilteredTotal(totalMeta || 0);
          setList(rows.map(normalizeProduct));
        }
      } catch (e: any) {
        if (!aborted) {
          setError(e?.message || "Failed to load products");
          setList([]);
          setFilteredTotal(0);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    run();
    return () => {
      aborted = true;
    };
  }, [
    slug,
    JSON.stringify(categoryDocIds),
    page,
    pageSize,
    appliedMin,
    appliedMax,
    productGenderSupported,
    appliedGenders.join(","), // 依赖 gender
    variantFiltersSupported,
    appliedMaterials.join(","),
    appliedSizes.join(","),
    appliedColors.join(","),
  ]);

  const start = (page - 1) * pageSize;

  const hrefForPage = useMemo(
    () => (p: number) => {
      const u = new URL(window.location.href);
      u.searchParams.set("page", String(p));
      return `/category/${slug}${u.search}`;
    },
    [slug]
  );

  const formatPrice = (price: number | null, currency?: string | null) => {
    if (price == null) return "$129";
    const cur = (currency || "USD").toUpperCase();
    return cur === "USD" ? `$${price}` : `${price} ${cur}`;
  };

  const resultLabel = `${filteredTotal} ${filteredTotal === 1 ? "result" : "results"}`;

  // 统一关闭抽屉（焦点回退）
  const closeDrawer = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
    setTimeout(() => triggerBtnRef.current?.focus(), 0);
  };

  // 提交筛选（把草稿写入 URL，重置到第 1 页）
  const applyDraft = () => {
    const u = new URL(window.location.href);

    if (typeof draftMin === "number" && draftMin >= 0)
      u.searchParams.set("min", String(draftMin));
    else u.searchParams.delete("min");

    if (typeof draftMax === "number" && draftMax >= 0)
      u.searchParams.set("max", String(draftMax));
    else u.searchParams.delete("max");

    const setCSV = (key: string, set: Set<string>) => {
      const arr = Array.from(set).filter(Boolean);
      if (arr.length) u.searchParams.set(key, arr.join(","));
      else u.searchParams.delete(key);
    };
    setCSV("material", draftMaterials);
    setCSV("size", draftSizes);
    setCSV("color", draftColors);
    setCSV("gender", draftGenders);

    u.searchParams.set("page", "1");

    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
    router.replace(`/category/${slug}${u.search}`);
    setTimeout(() => triggerBtnRef.current?.focus(), 0);
  };

  const resetDraft = () => {
    setDraftMin(undefined);
    setDraftMax(undefined);
    setDraftMaterials(new Set());
    setDraftSizes(new Set());
    setDraftColors(new Set());
    setDraftGenders(new Set());
  };

  const toggleInSet = (set: Set<string>, v: string, next: boolean) => {
    const n = new Set(set);
    if (next) n.add(v);
    else n.delete(v);
    return n;
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

          <div className="flex items-center gap-3">
            <div className="text-sm md:text-base text-neutral-600 whitespace-nowrap">
              {resultLabel}
            </div>

            <Button
              ref={triggerBtnRef}
              variant="outline"
              className="rounded-full px-5"
              onClick={() => setOpen(true)}
            >
              Filter
            </Button>
          </div>
        </div>
      </header>

      {/* === 左侧抽屉 === */}
      <div
        className={`fixed inset-0 z-50 transition ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* 背景遮罩 */}
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeDrawer}
        />
        {/* 面板 */}
        <aside
          role="dialog"
          aria-modal="true"
          className={`absolute left-0 top-0 h-full w-[92vw] sm:w-[380px] bg-white shadow-xl transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filter by</h2>
            <button
              ref={closeBtnRef}
              onClick={closeDrawer}
              aria-label="Close filter panel"
              title="Close"
              className="rounded-full p-2 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <X className="h-5 w-5 text-neutral-600" />
            </button>
          </div>

          <div className="h-[calc(100%-120px)] overflow-y-auto p-4">
            {/* Gender（Product 级） */}
            {productGenderSupported && facetGenders.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Gender
                </summary>
                <div className="mt-2 space-y-2">
                  {facetGenders.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={draftGenders.has(v)}
                        onChange={(e) => {
                          const { checked } = e.currentTarget;
                          setDraftGenders((s) => toggleInSet(s, v, checked));
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Size（Variant 级） */}
            {variantFiltersSupported && facetSizes.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Size
                </summary>
                <div className="mt-2 space-y-2">
                  {facetSizes.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={draftSizes.has(v)}
                        onChange={(e) => {
                          const { checked } = e.currentTarget;
                          setDraftSizes((s) => toggleInSet(s, v, checked));
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Colour（Variant 级） */}
            {variantFiltersSupported && facetColors.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Colour
                </summary>
                <div className="mt-2 space-y-2">
                  {facetColors.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={draftColors.has(v)}
                        onChange={(e) => {
                          const { checked } = e.currentTarget;
                          setDraftColors((s) => toggleInSet(s, v, checked));
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Material（Variant 级） */}
            {variantFiltersSupported && facetMaterials.length > 0 && (
              <details className="mb-4" open>
                <summary className="cursor-pointer select-none py-2 font-medium">
                  Material
                </summary>
                <div className="mt-2 space-y-2">
                  {facetMaterials.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={draftMaterials.has(v)}
                        onChange={(e) => {
                          const { checked } = e.currentTarget;
                          setDraftMaterials((s) => toggleInSet(s, v, checked));
                        }}
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </details>
            )}

            {/* Price */}
            <details className="mb-2" open>
              <summary className="cursor-pointer select-none py-2 font-medium">
                Price
              </summary>
              <div className="mt-2 flex items-end gap-3">
                <div className="flex-1">
                  <div className="text-xs text-neutral-500 mb-1">Min</div>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Min"
                    value={draftMin ?? ""}
                    onChange={(e) =>
                      setDraftMin(
                        e.currentTarget.value === ""
                          ? undefined
                          : Math.max(0, Number(e.currentTarget.value))
                      )
                    }
                  />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-neutral-500 mb-1">Max</div>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="Max"
                    value={draftMax ?? ""}
                    onChange={(e) =>
                      setDraftMax(
                        e.currentTarget.value === ""
                          ? undefined
                          : Math.max(0, Number(e.currentTarget.value))
                      )
                    }
                  />
                </div>
              </div>
            </details>
          </div>

          <div className="p-4 border-t flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={resetDraft}>
              Reset
            </Button>
            <Button onClick={applyDraft}>Apply</Button>
          </div>
        </aside>
      </div>

      {/* ====== 列表 ====== */}
      {error ? (
        <div className="py-20 text-center text-red-600">{error}</div>
      ) : loading ? (
        <section>
          <div className="grid gap-7 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
            {Array.from({ length: Math.min(pageSize, filteredTotal - start) || 8 }).map(
              (_, i) => (
                <CardSkeleton key={i} />
              )
            )}
          </div>
        </section>
      ) : list.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No products yet.</div>
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
                    <Button className="rounded-full px-5" size="sm">
                      Add
                    </Button>
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
