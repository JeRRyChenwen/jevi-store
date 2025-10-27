// src/components/search/CompactSearch.tsx
"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductSearch } from "./useProductSearch";

type Props = { className?: string; placeholder?: string };

export default function CompactSearch({
  className,
  placeholder = "Search for a product or brand",
}: Props) {
  const router = useRouter();

  const {
    query,
    setQuery,
    items,
    loading,
    opened,
    setOpened,
    error,
  } = useProductSearch();

  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = opened && (loading || error || items.length > 0);

  useEffect(() => {
    setActive(0);
  }, [items.length, opened]);

  const onBlurSafe = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => setOpened(false), 120);
  };

  const onFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if ((items.length > 0 || error || loading) && query.trim()) setOpened(true);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = query.trim();
    if (!v) return;
    setOpened(false);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!visible) return;
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
        router.push(`/product/${target.slug}`);
      } else {
        onSubmit(e as any);
      }
    } else if (e.key === "Escape") {
      setOpened(false);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  // —— 为了避免 TS 对 aria-* 的严格类型报错，这里用条件展开来生成 ariaProps ——
  const ariaProps: React.InputHTMLAttributes<HTMLInputElement> = {
    "aria-autocomplete": "list",
    "aria-controls": "search-suggestions",
    ...(visible ? { "aria-expanded": true, "aria-activedescendant": `search-item-${active}` } : {}),
  };

  return (
    <div ref={wrapperRef} className="relative">
      <form
        role="search"
        aria-label="site search"
        onSubmit={onSubmit}
        className={cn(
          "hidden md:flex items-center w-full max-w-[560px]",
          "rounded-full bg-white text-neutral-900",
          "border border-black/15 focus-within:border-black",
          "focus-within:ring-2 focus-within:ring-black/10",
          "transition-colors",
          className
        )}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim()) setOpened(true);
            else setOpened(false);
          }}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlurSafe}
          placeholder={placeholder}
          className="h-10 md:h-11 flex-1 bg-transparent outline-none px-4 text-sm placeholder:text-neutral-500"
          {...ariaProps}
        />
        <button
          type="submit"
          aria-label="Search"
          className="m-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 active:bg-neutral-200"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SearchIcon className="h-5 w-5" />}
        </button>
      </form>

      {visible && (
        <div
          className={cn(
            "absolute left-0 mt-2 w-[32rem] max-w-[90vw]",
            "rounded-xl border border-black/10 bg-white shadow-lg z-50"
          )}
          onMouseDown={(e) => {
            // 防止点选触发 input 的 blur 造成提前关闭
            e.preventDefault();
          }}
        >
          {error ? (
            <div className="p-3 text-sm text-red-600">搜索失败：{error}</div>
          ) : items.length === 0 && !loading ? (
            <div className="p-3 text-sm text-neutral-500">
              没有找到与 “{query}” 相关的产品
            </div>
          ) : (
            <ul id="search-suggestions" className="max-h-96 overflow-auto py-1">
              {items.map((it, idx) => (
                <li
                  key={it.id}
                  id={`search-item-${idx}`}
                  role="option"
                  aria-selected={idx === active}
                >
                  <Link
                    href={`/product/${it.slug}`}
                    onClick={() => setOpened(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm hover:bg-neutral-100",
                      idx === active && "bg-neutral-100"
                    )}
                    onMouseEnter={() => setActive(idx)}
                  >
                    <div className="h-10 w-10 rounded-md overflow-hidden bg-neutral-100 shrink-0">
                      {it.imageUrl ? (
                        <Image
                          src={it.imageUrl}
                          alt={it.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{it.name}</div>
                      {/* 第二行 slug 已移除 */}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {loading ? (
            <div className="p-2 text-xs text-neutral-500">正在搜索 “{query}” …</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
