// src/app/(shop)/returns/_components/SortIcon.tsx
"use client";

import type { SortDir } from "../types";

type Props = {
  dir: SortDir | null;
};

export default function SortIcon({ dir }: Props) {
  if (!dir) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-slate-500">{dir === "asc" ? "↑" : "↓"}</span>;
}