// src/components/nav/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function titleize(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  if (!pathname) return null;

  // ✅ product 详情页：用页面内的“正确面包屑”，全局这条隐藏掉
  if (pathname.startsWith("/product/")) return null;

  // 不显示的路径
  const hideExact = new Set<string>(["/"]);
  const hidePrefix = ["/auth", "/api"];
  if (
    hideExact.has(pathname) ||
    hidePrefix.some((p) => pathname === p || pathname.startsWith(p + "/"))
  )
    return null;

  // ✅ 特例：订单详情 /profile/orders/[id]
  if (pathname.startsWith("/profile/orders/")) {
    const orderId = decodeURIComponent(pathname.split("/").pop() || "");
    return (
      <nav
        className={cn("flex items-center text-sm text-gray-500 mb-4", className)}
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:underline text-gray-700 font-medium">
          Home
        </Link>

        <ChevronRight className="mx-1 h-4 w-4 text-gray-400" />
        <Link href="/profile" className="hover:underline text-gray-700">
          Profile
        </Link>

        <ChevronRight className="mx-1 h-4 w-4 text-gray-400" />
        <span className="text-black font-semibold">My Orders - {orderId}</span>
      </nav>
    );
  }

  // —— 其它路径：沿用原有通用逻辑 ——
  const raw = pathname.split("/").filter(Boolean);
  if (!raw.length) return null;

  // ✅ 过滤规则（通用）
  // - 不显示 category 这个段
  // - ✅ 特例：/order/confirmation 不显示 order（避免 404）
  const shown = raw
    .map((seg, i) => ({ seg, i }))
    .filter(({ seg }) => seg !== "category")
    .filter(({ seg }) => {
      if (pathname.startsWith("/order/confirmation")) {
        return seg !== "order"; // ✅ 关键：隐藏 order
      }
      return true;
    });

  if (shown.length === 0) return null;

  const labelMap: Record<string, string> = {
    checkout: "Checkout",
    payment: "Payment",
    orders: "My Orders",
    account: "My Account",
    profile: "Profile",
    product: "Product",

    // ✅ 可选：让 confirmation 显示更友好一点
    confirmation: "Confirmation",
  };

  // ✅ 这些段没有 index page（点了会 404），所以不要生成链接
  const noIndexLink = new Set<string>(["product", "order"]);

  return (
    <nav
      className={cn("flex items-center text-sm text-gray-500 mb-4", className)}
      aria-label="Breadcrumb"
    >
      <Link href="/" className="hover:underline text-gray-700 font-medium">
        Home
      </Link>

      {shown.map(({ seg, i }, idx) => {
        const href = "/" + raw.slice(0, i + 1).join("/");
        const isLast = idx === shown.length - 1;
        const label = labelMap[seg] ?? titleize(seg);

        const shouldLink = !isLast && !noIndexLink.has(seg);

        return (
          <span key={href} className="flex items-center">
            <ChevronRight className="mx-1 h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="text-black font-semibold">{label}</span>
            ) : shouldLink ? (
              <Link href={href} className="hover:underline text-gray-700">
                {label}
              </Link>
            ) : (
              <span className="text-gray-700">{label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
