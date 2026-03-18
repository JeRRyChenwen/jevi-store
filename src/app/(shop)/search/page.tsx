"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { api, resolveMediaURL } from "@/lib/strapi";

type SearchRow = any;

type SearchItem = {
  id: string | number;
  name: string;
  slug: string;
  imageUrl: string;
};

function firstImageFromProduct(attrs: any): string {
  const colorGalleries = Array.isArray(attrs?.color_galleries) ? attrs.color_galleries : [];

  for (const cg of colorGalleries) {
    const rel = cg?.images;
    if (!rel) continue;

    // 兼容 v4 / v5 / 多图 / 单图
    if (Array.isArray(rel) && rel.length) {
      const u = resolveMediaURL(rel[0], "medium");
      if (u) return u;
    }

    if (rel?.data) {
      if (Array.isArray(rel.data) && rel.data.length) {
        const u = resolveMediaURL(rel.data[0], "medium");
        if (u) return u;
      }
      const u = resolveMediaURL(rel.data, "medium");
      if (u) return u;
    }

    const u = resolveMediaURL(rel, "medium");
    if (u) return u;
  }

  return "";
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim();

  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageTitle = useMemo(() => {
    if (!q) return "Search";
    return `Search results for “${q}”`;
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!q) {
        setItems([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const p = new URLSearchParams();
        p.append("filters[title][$containsi]", q);
        p.append("publicationState", "live");
        p.append("pagination[pageSize]", "24");
        p.append("fields[0]", "title");
        p.append("fields[1]", "slug");
        p.append("populate[color_galleries][populate][images]", "true");

        const res: any = await api(`/api/products?${p.toString()}`, {
          noCache: true,
          requireAuth: true,
        });

        const rows: SearchRow[] = Array.isArray(res?.data) ? res.data : [];

        const mapped: SearchItem[] = rows
          .map((row: any) => {
            const attrs = row?.attributes ?? row ?? {};
            const slug = attrs?.slug ?? "";
            const name = (attrs?.title ?? "").trim();
            const id = row?.id ?? attrs?.id ?? Math.random().toString(36).slice(2);
            const imageUrl = firstImageFromProduct(attrs);

            return {
              id,
              slug,
              name: name || "(Untitled)",
              imageUrl,
            };
          })
          .filter((it) => it.slug);

        if (!cancelled) {
          setItems(mapped);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Search failed");
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8 md:py-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SearchIcon className="h-4 w-4" />
          <span>{pageTitle}</span>
        </div>

        {q ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {loading ? "Searching..." : `${items.length} result${items.length === 1 ? "" : "s"}`}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a keyword to search products.
          </p>
        )}
      </div>

      {!q ? (
        <div className="rounded-2xl border bg-card p-8 text-sm text-muted-foreground">
          Try searching for shoes, tops, sale, leather, or marble.
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <div className="aspect-[3/4] animate-pulse bg-muted" />
              <div className="p-3 md:p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-sm text-muted-foreground">
          No products found for “{q}”.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-6">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/product/${item.slug}`}
              className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="aspect-[3/4] bg-muted overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>

              <div className="p-3 md:p-4">
                <h2 className="line-clamp-2 text-sm font-medium leading-5 md:text-base">
                  {item.name}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}