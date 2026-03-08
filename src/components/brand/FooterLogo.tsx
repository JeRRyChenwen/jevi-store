// src/components/brand/FooterLogo.tsx
import BrandLogo from "@/components/brand/BrandLogo";

/**
 * ✅ Footer 专用 Logo
 * Footer 场景下 logo 一般比 Auth 小，比 Navbar 略柔和
 * 以后如果想单独调整 Footer 的 logo，只改这里即可
 */
export default function FooterLogo() {
  return (
    <BrandLogo
      src="/brand/logo-horizontal.png"
      height={42}
      clickable={false}
      priority={false}
    />
  );
}