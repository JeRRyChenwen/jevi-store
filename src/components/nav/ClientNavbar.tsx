// src/components/ClientNavbar.tsx
"use client";
import dynamic from "next/dynamic";

// 只在客户端渲染 Navbar，避免 SSR/CSR 结构不一致
const NavbarImpl = dynamic(() => import("./Navbar"), {
  ssr: false,
  // 可选：加载占位，避免首屏抖动
  loading: () => (
    <nav className="w-full flex justify-between items-center px-6 py-4 border-b bg-background">
      <div className="text-xl font-bold">SocialPlatform</div>
      <div className="w-6 h-6 rounded-full bg-muted" />
    </nav>
  ),
});

export default function ClientNavbar() {
  return <NavbarImpl />;
}
