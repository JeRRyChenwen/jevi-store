"use client";

import * as React from "react";
import FilterButton from "@/components/filters/FilterButton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

export type SortKey = "default" | "price-desc" | "price-asc" | "hot";

const SORT_LABELS: Record<SortKey, string> = {
  default: "Default",
  "price-desc": "Price: High → Low",
  "price-asc": "Price: Low → High",
  hot: "Popularity",
};

export type CategoryHeaderProps = {
  title: string;
  slug: string;
  resultLabel: string;

  sortKey: SortKey;
  setSortInUrl: (next: SortKey) => void;

  onOpenFilter: () => void;
  triggerBtnRef?: React.RefObject<HTMLButtonElement | null>;
};

export default function CategoryHeader({
  title,
  slug,
  resultLabel,
  sortKey,
  setSortInUrl,
  onOpenFilter,
  triggerBtnRef,
}: CategoryHeaderProps) {
  return (
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

          {/* Sort */}
          <div className="hidden sm:flex">
            <Select value={sortKey} onValueChange={(v) => setSortInUrl(v as SortKey)}>
              <SelectTrigger
                className="rounded-full w-[190px] border px-3 py-2 text-sm focus:ring-2 focus:ring-black/10"
                aria-label="Sort products"
              >
                <SelectValue placeholder="Sort">
                  {SORT_LABELS[sortKey] ?? "Sort"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="z-50 rounded-xl border shadow-lg">
                <SelectGroup>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="price-desc">Price: High → Low</SelectItem>
                  <SelectItem value="price-asc">Price: Low → High</SelectItem>
                  <SelectItem value="hot">Popularity</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <FilterButton
            ref={triggerBtnRef}
            label="Filter"
            onClick={onOpenFilter}
            className="rounded-full px-5"
          />
        </div>
      </div>
    </header>
  );
}
