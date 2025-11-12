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
        {/* 最后一段不加链接，合并为 “My Orders - {订单号}” */}
        <span className="text-black font-semibold">
          My Orders - {orderId}
        </span>
      </nav>
    );
  }

  // —— 其它路径：沿用原有通用逻辑 ——
  const raw = pathname.split("/").filter(Boolean);
  if (!raw.length) return null;

  const shown = raw.map((seg, i) => ({ seg, i })).filter(({ seg }) => seg !== "category");
  if (shown.length === 0) return null;

  const labelMap: Record<string, string> = {
    checkout: "Checkout",
    payment: "Payment",
    orders: "My Orders",
    account: "My Account",
    profile: "Profile",
  };

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
