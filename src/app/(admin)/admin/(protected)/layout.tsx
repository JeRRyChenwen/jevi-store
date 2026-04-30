// src/app/(admin)/admin/(protected)/layout.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AdminAuthGate from "../AdminAuthGate";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      window.location.replace("/admin/login");
    }
  };

  // ⭐ 高亮判断函数
  const isActive = (path: string) => {
    if (path === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    [
      "block px-3 py-2 rounded-md text-sm transition",
      isActive(path)
        ? "bg-black text-white"
        : "text-slate-700 hover:bg-slate-100",
    ].join(" ");

  return (
    <AdminAuthGate>
      <div className="min-h-screen flex bg-slate-50">
        {/* sidebar */}
        <aside className="w-64 border-r bg-white flex flex-col">
          <div className="px-4 py-6 border-b">
            <h1 className="text-lg font-semibold">Admin Console</h1>
            <p className="text-xs text-slate-500 mt-1">Operations & Support</p>
          </div>

          {/* menu */}
          <nav className="mt-4 px-2 space-y-1 flex-1">
            <Link href="/admin" className={linkClass("/admin")}>
              Dashboard
            </Link>

            <Link href="/admin/orders" className={linkClass("/admin/orders")}>
              Orders
            </Link>

            <Link href="/admin/returns" className={linkClass("/admin/returns")}>
              Returns
            </Link>

            <Link
              href="/admin/inventory"
              className={linkClass("/admin/inventory")}
            >
              Inventory
            </Link>

            <Link
              href="/admin/shipping-fee-calculation"
              className={linkClass("/admin/shipping-fee-calculation")}
            >
              Shipping Fee Calculation
            </Link>

            <Link
              href="/admin/shipping-rules"
              className={linkClass("/admin/shipping-rules")}
            >
              Shipping Rules Management
            </Link>

            <Link
              href="/admin/postcode-zone-rules"
              className={linkClass("/admin/postcode-zone-rules")}
            >
              Postcode Zone Rules Management
            </Link>
          </nav>

          {/* logout */}
          <div className="px-2 pb-4 pt-3 border-t">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-sm text-slate-800 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* main */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </AdminAuthGate>
  );
}
