"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { Search, X } from "lucide-react";

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-24 w-full max-w-2xl px-4" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit} className="relative">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, brands..."
            className="w-full h-12 rounded-full bg-background border pl-5 pr-12 text-base shadow-lg
                       focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            aria-label="submit search"
            className="absolute right-2 top-1.5 h-9 w-9 rounded-full bg-primary text-primary-foreground
                       flex items-center justify-center"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="absolute -right-12 top-1.5 hidden md:flex h-9 w-9 items-center justify-center text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
