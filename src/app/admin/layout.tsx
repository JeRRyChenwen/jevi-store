// src/app/admin/layout.tsx
import React from "react";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* 左侧侧边栏 */}
      <aside className="w-64 border-r bg-white">
        <div className="px-4 py-6 border-b">
          <h1 className="text-lg font-semibold">Admin Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            Operations & Support
          </p>
        </div>

        <nav className="mt-4 px-2 space-y-1">
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
        </nav>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
