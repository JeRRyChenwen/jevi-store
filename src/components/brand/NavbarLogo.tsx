// src/components/brand/NavbarLogo.tsx
import BrandLogo from "@/components/brand/BrandLogo";

/**
 * ✅ Navbar 专用 Logo
 * 以后如果你想单独调整 Navbar 的 Logo：
 * - 高度
 * - 图片路径
 * - 是否 clickable
 * - className
 * 都只改这个文件即可
 */
export default function NavbarLogo() {
  return (
    <BrandLogo
      src="/brand/logo-600-350.png"
      height={55}
      imageClassName="h-10 w-auto md:h-[55px]"
      priority
    />
  );
}