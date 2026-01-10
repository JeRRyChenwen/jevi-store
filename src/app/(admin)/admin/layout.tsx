// src/app/(admin)/admin/layout.tsx
import React from "react";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ 这里不要放 AdminAuthGate，也不要放 Sidebar
  // ✅ 让 /admin/login 渲染时就是干净页面
  return <>{children}</>;
}
