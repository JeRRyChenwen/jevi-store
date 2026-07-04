// src/components/brand/NavbarLogo.tsx
import BrandLogo from "@/components/brand/BrandLogo";

/**
 * Navbar 专用 Logo
 */
export default function NavbarLogo() {
  return (
    <BrandLogo
      src="/brand/logo-600-350.png"
      height={28}
      imageClassName="h-5 w-auto md:h-6"
      priority
    />
  );
}
