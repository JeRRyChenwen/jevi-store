// src/components/nav/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

function titleize(slug: string) {
  // formal-shoes -> Formal Shoes
  return slug
    .split("-")
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname) return null;

  // 隐藏整页/前缀（如登录、接口路由等）
  const hideExact = new Set<string>(["/"]);
  const hidePrefix = ["/auth", "/api"];
  if (
    hideExact.has(pathname) ||
    hidePrefix.some(p => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return null;
  }

  // 原始段（含 category，用于计算 href）
  const raw = pathname.split("/").filter(Boolean);
  if (!raw.length) return null;

  // 过滤掉 “category” 段，但保留它之后的段
  // 同时记录每个显示段在原始数组里的索引，方便生成正确 href
  const shown = raw
    .map((seg, i) => ({ seg, i }))
    .filter(({ seg }) => seg !== "category");

  // 所有段都被过滤（例如 /category）时，不显示面包屑
  if (shown.length === 0) return null;

  // 可选：对特定段做友好映射
  const labelMap: Record<string, string> = {
    checkout: "Checkout",
    payment: "Payment",
    orders: "My Orders",
    account: "My Account",
  };

  return (
    <nav className="flex items-center text-sm text-gray-500 mb-4">
      <Link href="/" className="hover:underline text-gray-700 font-medium">
        Home
      </Link>

      {shown.map(({ seg, i }, idx) => {
        // href 仍基于“原始段”，确保最后一段能回到实际页面
        const href = "/" + raw.slice(0, i + 1).join("/");
        const isLast = idx === shown.length - 1;
        const label = labelMap[seg] ?? titleize(seg);

        return (
          <span key={href} className="flex items-center">
            <ChevronRight className="mx-1 h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="text-black font-semibold">{label}</span>
            ) : (
              <Link href={href} className="hover:underline text-gray-700">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
