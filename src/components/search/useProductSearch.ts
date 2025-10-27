// src/components/search/useProductSearch.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/strapi";

// ===== 前端展示项 =====
export type SearchItem = {
  id: number | string;
  name: string;
  slug: string;
  imageUrl?: string | null;
};

// ===== 宽松类型（只在前端解析用）=====
type StrapiImage = {
  url?: string | null;
  formats?: { thumbnail?: { url?: string | null } };
};
type StrapiMediaRel =
  | { data?: { attributes?: StrapiImage }[] }
  | { attributes?: StrapiImage }[]
  | StrapiImage[]
  | StrapiImage
  | any;

type ColorGalleryItem = { images?: StrapiMediaRel };
type ProductAttrs = {
  title?: string;
  slug?: string;
  color_galleries?: ColorGalleryItem[]; // 你的图片就放这里
};

type StrapiRowStandard = { id?: number; attributes?: ProductAttrs };
type StrapiRowFlat = ProductAttrs & { id?: number };
type StrapiRow = StrapiRowStandard | StrapiRowFlat;

// ===== ENV / fetch 帮助函数 =====
const STRAPI_BASE = (process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337").replace(/\/$/, "");
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN ?? "";

async function fetchStrapiJson(pathWithQuery: string, init?: RequestInit) {
  const url = pathWithQuery.startsWith("http") ? pathWithQuery : `${STRAPI_BASE}${pathWithQuery}`;
  const headers = new Headers(init?.headers ?? {});
  headers.set("accept", "application/json");
  if (STRAPI_TOKEN) headers.set("authorization", `Bearer ${STRAPI_TOKEN}`);
  const res = await fetch(url, { ...init, method: "GET", headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Strapi ${res.status} ${res.statusText}\nURL: ${url}\n${txt.slice(0, 500)}`);
  }
  return res.json();
}

// ===== 从 color_galleries 里取第一张图 =====
function firstImageUrlFromColorGalleries(attrs?: ProductAttrs): string | null {
  const arr: any[] = Array.isArray(attrs?.color_galleries) ? attrs!.color_galleries! : [];
  for (const cg of arr) {
    const rel = cg?.images as StrapiMediaRel | undefined;
    if (!rel) continue;

    // { data: [{ attributes: { url } }]}
    const data = (rel as any)?.data;
    if (Array.isArray(data) && data.length) {
      const a: StrapiImage | undefined = data[0]?.attributes;
      const thumb = a?.formats?.thumbnail?.url;
      const raw = thumb || a?.url || null;
      if (raw) return mediaUrl(raw);
      continue;
    }

    // 扁平：[{ attributes: { url } }] / 直接数组：[{ url }]
    const arrAny = Array.isArray(rel) ? rel : [];
    if (arrAny.length) {
      const a: StrapiImage | undefined = arrAny[0]?.attributes ?? arrAny[0];
      const thumb = a?.formats?.thumbnail?.url;
      const raw = thumb || a?.url || null;
      if (raw) return mediaUrl(raw);
    }

    // 单对象
    const a3: StrapiImage | undefined = (rel as any)?.attributes ?? (rel as any);
    if (a3?.url || a3?.formats?.thumbnail?.url) {
      const raw = a3.formats?.thumbnail?.url || a3.url!;
      return mediaUrl(raw);
    }
  }
  return null;
}

// ========== API 层 ==========

// A. 单次查询：同时拿 title/slug 和 color_galleries.images（首选）
async function searchProductsOneShot(q: string) {
  const p = new URLSearchParams();
  p.append("filters[title][$containsi]", q);
  p.append("pagination[pageSize]", "10");
  p.append("publicationState", "live"); // 只查已发布，减少无图干扰
  // 只要最小字段，避免 payload 过大
  p.append("fields[0]", "title");
  p.append("fields[1]", "slug");
  // 正确的 v5 嵌套 populate：组件 -> images（Multiple Media）
  p.append("populate[color_galleries][populate][images]", "true");

  return fetchStrapiJson(`/api/products?${p.toString()}`);
}

// B. 两步法：先查列表（只取 title/slug），再按 id 单条补图
async function searchProductsBasic(q: string) {
  const p = new URLSearchParams();
  p.append("filters[title][$containsi]", q);
  p.append("pagination[pageSize]", "10");
  p.append("publicationState", "live");
  p.append("fields[0]", "title");
  p.append("fields[1]", "slug");
  return fetchStrapiJson(`/api/products?${p.toString()}`);
}

async function fetchProductFirstImageById(id: number | string): Promise<string | null> {
  // 只 populate 你需要的节点
  const p = new URLSearchParams();
  p.append("populate[color_galleries][populate][images]", "true");
  p.append("fields[0]", "title"); // 保留一个 fields，避免 * 带来大 payload
  const r = await fetchStrapiJson(`/api/products/${id}?${p.toString()}`);
  const attrs: ProductAttrs = r?.data?.attributes ?? r ?? {};
  return firstImageUrlFromColorGalleries(attrs);
}

// ========== Hook ==========
export function useProductSearch() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const q = query.trim();
    if (!q) {
      setItems([]);
      setOpened(false);
      setError(null);
      abortRef.current?.abort();
      return;
    }

    if (q.length < 2) {
      setItems([]);
      setOpened(false);
      setError(null);
      return;
    }

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);

      try {
        // 优先尝试 “一次拿齐”（包含 images）
        let rows: StrapiRow[] | undefined;
        try {
          const resOne = await searchProductsOneShot(q);
          rows = (resOne?.data as StrapiRow[]) ?? [];
          if (process.env.NODE_ENV !== "production") {
            console.debug("[search] one-shot ok, rows:", rows.length);
          }
        } catch (e) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[search] one-shot failed, fallback to 2-step:", (e as Error)?.message);
          }
        }

        // 如果一次式失败，退回“两步法”
        if (!rows) {
          const resBasic = await searchProductsBasic(q);
          rows = (resBasic?.data as StrapiRow[]) ?? [];
        }

        // 先渲染 title/slug
        const baseList: SearchItem[] = rows.map((row) => {
          const attrs: ProductAttrs =
            (row as StrapiRowStandard).attributes ?? (row as StrapiRowFlat) ?? {};
          const id =
            (row as StrapiRowStandard).id ??
            (row as unknown as { id?: number })?.id ??
            Math.random();

          return {
            id: id as number,
            name: (attrs.title || "").trim() || "(Untitled)",
            slug: attrs.slug ?? "",
            imageUrl: null,
          };
        });

        setItems(baseList);
        setOpened(true);

        // 如果 one-shot 已经带回了图片，直接填充；否则按 id 再补一次
        const oneShotHadImages = rows.some((row) => {
          const attrs: ProductAttrs =
            (row as StrapiRowStandard).attributes ?? (row as StrapiRowFlat) ?? {};
          return !!firstImageUrlFromColorGalleries(attrs);
        });

        if (oneShotHadImages) {
          setItems((prev) =>
            prev.map((it, idx) => {
              const attrs: ProductAttrs =
                (rows![idx] as StrapiRowStandard).attributes ??
                (rows![idx] as StrapiRowFlat) ??
                {};
              const u = firstImageUrlFromColorGalleries(attrs);
              return u ? { ...it, imageUrl: u } : it;
            })
          );
        } else {
          // 两步补图（按 id 单条查询）
          await Promise.all(
            baseList.map(async (it, idx) => {
              try {
                const u = await fetchProductFirstImageById(it.id);
                if (abortRef.current !== ac) return; // 已被新查询打断
                if (u) {
                  setItems((prev) => {
                    if (!prev[idx] || prev[idx].id !== it.id) return prev;
                    const next = prev.slice();
                    next[idx] = { ...prev[idx], imageUrl: u };
                    return next;
                  });
                }
              } catch {
                /* 单条失败忽略 */
              }
            })
          );
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Search failed");
          setOpened(true);
        }
      } finally {
        if (abortRef.current === ac) setLoading(false);
      }
    }, 250);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [query]);

  return { query, setQuery, items, loading, opened, setOpened, error };
}
