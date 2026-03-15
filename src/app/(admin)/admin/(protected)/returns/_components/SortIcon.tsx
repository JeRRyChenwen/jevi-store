import type { SortDir } from "../returns.types";

export default function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1 text-slate-500">{dir === "asc" ? "↑" : "↓"}</span>;
}