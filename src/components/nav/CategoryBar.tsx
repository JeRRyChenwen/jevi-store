"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Item = {
  label: string;
  href: string;                 // 建议走 /category/[slug]
  children?: { label: string; href: string }[];
};

const DEFAULT_ITEMS: Item[] = [
  { label: "New In",        href: "/category/new-in" },
  { label: "Women",         href: "/category/women" },
  { label: "Men",           href: "/category/men" },
  { label: "Beauty",        href: "/category/beauty" },
  { label: "Home",          href: "/category/home" },
  { label: "Travel & Tech", href: "/category/travel-tech" },
  { label: "Kids",          href: "/category/kids" },
  { label: "Toys",          href: "/category/toys" },
  { label: "Gifts",         href: "/category/gifts" },
  { label: "Sale",          href: "/category/sale" },
  { label: "MYER one",      href: "/category/member" },
];

function cls(...x: Array<string | false | undefined>) {
  return x.filter(Boolean).join(" ");
}

export default function CategoryBar({ items = DEFAULT_ITEMS }: { items?: Item[] }) {
  const pathname = usePathname();

  return (
    <section className="w-full border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <nav
          aria-label="Shop categories"
          className="flex items-center gap-2 md:gap-4 overflow-x-auto py-3 md:py-4"
        >
          {items.map((it) => {
            const active =
              pathname === it.href ||
              (pathname?.startsWith(it.href + "/") ?? false);

            // 有子项：用 Dropdown（可选）
            if (it.children && it.children.length > 0) {
              return (
                <DropdownMenu key={it.href}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cls(
                        "inline-flex items-center gap-1 whitespace-nowrap",
                        "px-2 md:px-3 py-2 text-sm md:text-[15px] font-medium",
                        "border-b-2",
                        active ? "border-foreground" : "border-transparent hover:border-foreground/40"
                      )}
                    >
                      {it.label}
                      <ChevronDown className="w-4 h-4" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {it.children.map((c) => (
                      <DropdownMenuItem key={c.href} asChild>
                        <Link href={c.href}>{c.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // 无子项：普通链接
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cls(
                  "whitespace-nowrap px-2 md:px-3 py-2 text-sm md:text-[15px] font-medium",
                  "border-b-2",
                  active
                    ? "border-foreground"
                    : "border-transparent hover:border-foreground/40"
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
