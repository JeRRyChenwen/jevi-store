// src/components/search/useProductSearch.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/strapi";

export type SearchItem = {
  id: number | string;
  name: string; // 展示用：title（缺失回退 slug）
  slug: string;
  imageUrl?: string | null;
};

type StrapiImage = { url?: string | null };
type StrapiMediaRel = { data?: { attributes?: StrapiImage }[] };

type ProductAttrs = {
  title?: string;
  slug?: string;
  thumbnail?: { data?: { attributes?: StrapiImage } };
  gallery?: StrapiMediaRel;
  images?: StrapiMediaRel;
};

// 兼容两种形态：
// 1) 标准：{ id, attributes: {...} }
// 2) 扁平：{ id, title, slug, ... }
type StrapiRowStandard = { id?: number; attributes?: ProductAttrs };
type StrapiRowFlat = ProductAttrs & { id?: number };
type StrapiRow = StrapiRowStandard | StrapiRowFlat;

// 取图片：thumbnail → gallery[0] → images[0]
function imageUrlFromProduct(p: ProductAttrs): string | null {
  const thumb = p?.thumbnail?.data?.attributes?.url;
  if (thumb) return mediaUrl(thumb);
  const g0 = p?.gallery?.data?.[0]?.attributes?.url;
  if (g0) return mediaUrl(g0);
  const i0 = p?.images?.data?.[0]?.attributes?.url;
  if (i0) return mediaUrl(i0);
  return null;
}

// ENV
const STRAPI_BASE = (process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337").replace(/\/$/, "");
const STRAPI_TOKEN = process.env.NEXT_PUBLIC_STRAPI_TOKEN ?? "";

// 直连 Strapi v5（带可选 token）
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
        // 只按 title 模糊匹配
        const params = new URLSearchParams();
        params.append("filters[title][$containsi]", q);
        params.append("pagination[pageSize]", "10");
        params.append("populate", "*"); // 最稳妥，避免字段裁剪
        // 如果启用了多语言且想固定语言，可开启：
        // params.append("locale", "en");

        const res = await fetchStrapiJson(`/api/products?${params.toString()}`, {
          signal: ac.signal,
        });

        const rows = (res?.data as StrapiRow[] | undefined) ?? [];

        // 开发期辅助看返回形态
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.debug("[search] raw data:", rows.slice?.(0, 3));
        }

        const list: SearchItem[] = [];
        for (const row of rows) {
          // 兼容两种形态：attributes 优先，否则用扁平对象本身
          const attrs: ProductAttrs = (row as StrapiRowStandard).attributes ?? (row as StrapiRowFlat) ?? {};
          const id =
            (row as StrapiRowStandard).id ??
            (row as unknown as { id?: number })?.id ??
            Math.random(); // 极端兜底，避免 React key 冲突

          const display = (attrs.title || attrs.slug || "").trim() || "(Untitled)";

          list.push({
            id: id as number,
            name: display,
            slug: attrs.slug ?? "",
            imageUrl: imageUrlFromProduct(attrs),
          });
        }

        setItems(list);
        setOpened(true);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Search failed");
          setOpened(true);
        }
      } finally {
        setLoading(false);
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
