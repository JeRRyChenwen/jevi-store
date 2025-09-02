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
  href: string; // 建议走 /category/[slug]
  children?: { label: string; href: string }[];
};

const DEFAULT_ITEMS: Item[] = [
  { label: "Shoes",       href: "/category/shoes" },
  { label: "Bottoms",     href: "/category/bottoms" },
  { label: "Tops",        href: "/category/tops" },
  { label: "Suit",        href: "/category/suit" },
  { label: "Accessories", href: "/category/accessories" },
  { label: "Outfit",      href: "/category/outfit" },
];

function cls(...x: Array<string | false | undefined>) {
  return x.filter(Boolean).join(" ");
}

export default function CategoryBar({ items = DEFAULT_ITEMS }: { items?: Item[] }) {
  const pathname = usePathname();

  return (
    // ✅ 纯白不透明；深色模式也保持白底 + 深色文字；加下边框与轻阴影
    // 如果 CategoryBar 不在 sticky 的 header 里，并且需要吸顶，
    // 可以把下一行换成： "sticky top-20 z-40 w-full border-b bg-white dark:bg-white text-neutral-900 shadow-sm"
    <section className="w-full border-b bg-white dark:bg-white text-neutral-900 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        <nav
          aria-label="Shop categories"
          className="
            flex w-full items-center
            gap-2 md:gap-4
            overflow-x-auto md:overflow-visible
            py-3 md:py-4
            justify-start md:justify-center
          "
        >
          {items.map((it) => {
            const active =
              pathname === it.href ||
              (pathname?.startsWith(it.href + "/") ?? false);

            // 有子项：下拉
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
