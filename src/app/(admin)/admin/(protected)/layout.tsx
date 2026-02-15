// src/app/(admin)/admin/(protected)/layout.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminAuthGate from "../AdminAuthGate";

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } finally {
      // ✅ 关键：硬跳转，彻底离开 (protected) layout，停止 Gate 循环
      window.location.replace("/admin/login");
    }
  };

  return (
    <AdminAuthGate>
      <div className="min-h-screen flex bg-slate-50">
        <aside className="w-64 border-r bg-white flex flex-col">
          <div className="px-4 py-6 border-b">
            <h1 className="text-lg font-semibold">Admin Console</h1>
            <p className="text-xs text-slate-500 mt-1">Operations & Support</p>
          </div>

          <nav className="mt-4 px-2 space-y-1 flex-1">
            <Link
              href="/admin"
              className="block px-3 py-2 rounded-md text-sm hover:bg-slate-100"
            >
              Dashboard
            </Link>

            <Link
              href="/admin/returns"
              className="block px-3 py-2 rounded-md text-sm hover:bg-slate-100"
            >
              Returns
            </Link>

            {/* ✅ NEW: Inventory */}
            <Link
              href="/admin/inventory"
              className="block px-3 py-2 rounded-md text-sm hover:bg-slate-100"
            >
              Inventory
            </Link>
          </nav>

          <div className="px-2 pb-4 pt-3 border-t">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-md text-sm text-slate-800 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </AdminAuthGate>
  );
}
