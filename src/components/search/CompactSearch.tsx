// src/components/search/CompactSearch.tsx
"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { cn } from "@/lib/utils";

type Props = { className?: string };

export default function CompactSearch({ className }: Props) {
  const [q, setQ] = useState("");
  const router = useRouter();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  return (
    <form
      role="search"
      aria-label="site search"
      onSubmit={onSubmit}
      className={cn(
        "hidden md:flex items-center w-full max-w-[560px]",
        "rounded-full bg-white text-neutral-900",
        // ★ 黑色细边框 + 聚焦高亮
        "border border-black/15 focus-within:border-black",
        "focus-within:ring-2 focus-within:ring-black/10",
        "transition-colors",
        className
      )}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for a product or brand"
        className="h-10 md:h-11 flex-1 bg-transparent outline-none px-4 text-sm placeholder:text-neutral-500"
      />
      <button
        type="submit"
        aria-label="Search"
        className="m-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 active:bg-neutral-200"
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
}
