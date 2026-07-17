"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductSearch } from "./useProductSearch";

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  const { query, setQuery, items, loading, opened, setOpened, error } =
    useProductSearch();

  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const visible =
    opened &&
    query.trim().length >= 2 &&
    (loading || !!error || items.length >= 0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setOpened(false);
      setActive(0);
    }
  }, [open, setQuery, setOpened]);

  useEffect(() => {
    setActive(0);
  }, [items.length, opened]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = query.trim();
    if (!v) return;
    setOpened(false);
    onClose();
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!visible) {
      if (e.key === "Enter") {
        submit(e as unknown as FormEvent);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = items[active];
      if (target?.slug) {
        setOpened(false);
        onClose();
        router.push(`/product/${target.slug}`);
      } else {
        submit(e as unknown as FormEvent);
      }
    } else if (e.key === "Escape") {
      setOpened(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-20 w-full max-w-2xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <form onSubmit={submit} className="relative">
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                if (v.trim().length >= 2) setOpened(true);
                else setOpened(false);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setOpened(true);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search products, brands..."
              className="w-full h-14 rounded-full bg-background border pl-7 pr-14 text-base shadow-lg
                         focus:outline-none focus:ring-2 focus:ring-primary"
              aria-autocomplete="list"
              aria-controls="mobile-search-suggestions"
              aria-expanded={visible}
              aria-activedescendant={
                visible ? `mobile-search-item-${active}` : undefined
              }
            />

            <button
              type="submit"
              aria-label="submit search"
              className="absolute right-2 top-2 h-10 w-10 rounded-full bg-primary text-primary-foreground
                         flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="close"
              className="absolute -right-12 top-2 hidden md:flex h-10 w-10 items-center justify-center text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </form>

          {visible && (
            <div
              className={cn(
                "absolute left-0 right-0 mt-2",
                "rounded-2xl border border-black/10 bg-white shadow-xl z-50 overflow-hidden",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
            >
              {error ? (
                <div className="p-4 text-sm text-red-600">
                  Search failed: {error}
                </div>
              ) : !loading && items.length === 0 ? (
                <div className="p-4 text-sm text-neutral-500">
                  No products found for “{query}”
                </div>
              ) : (
                <ul
                  id="mobile-search-suggestions"
                  className="max-h-[60vh] overflow-auto py-1"
                >
                  {items.map((it, idx) => (
                    <li
                      key={it.id}
                      id={`mobile-search-item-${idx}`}
                      role="option"
                      aria-selected={idx === active}
                    >
                      <Link
                        href={`/product/${it.slug}`}
                        onClick={() => {
                          setOpened(false);
                          onClose();
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-sm hover:bg-neutral-100",
                          idx === active && "bg-neutral-100",
                        )}
                        onMouseEnter={() => setActive(idx)}
                      >
                        <div className="h-12 w-12 rounded-md overflow-hidden bg-neutral-100 shrink-0">
                          {it.imageUrl ? (
                            <Image
                              src={it.imageUrl}
                              alt={it.name}
                              width={48}
                              height={48}
                              unoptimized
                              className="h-12 w-12 object-contain"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{it.name}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {loading ? (
                <div className="px-4 pb-3 text-xs text-neutral-500">
                  Searching “{query}”...
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
