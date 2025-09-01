"use client";

import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CompactSearch({ className = "" }: { className?: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  return (
    // 仅桌面端显示，移动端隐藏
    <form onSubmit={onSubmit} className={cn("hidden md:flex flex-1 justify-center", className)}>
      <div className="relative w-full max-w-xl">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for a product or brand"
          className="w-full h-10 rounded-full bg-muted/70 pl-4 pr-10 text-sm outline-none
                     focus:ring-2 focus:ring-primary transition"
          aria-label="Search"
        />
        <button
          type="submit"
          aria-label="submit search"
          className="absolute right-1 top-1.5 h-7 w-7 rounded-full flex items-center justify-center"
        >
          <Search className="h-4 w-4 opacity-70" />
        </button>
      </div>
    </form>
  );
}
