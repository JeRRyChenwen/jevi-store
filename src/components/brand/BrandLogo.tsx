// src/components/brand/BrandLogo.tsx
import Link from "next/link";
import Image from "next/image";
import { BRAND } from "@/lib/brand";

type BrandLogoProps = {
  /**
   * 是否可点击跳转首页
   */
  clickable?: boolean;

  /**
   * logo 显示高度（px）
   * 横版 logo 建议用高度控制，宽度自动等比例缩放
   */
  height?: number;

  /**
   * 外层 className
   */
  className?: string;

  /**
   * ✅ 图片本体 className
   * 用于像 Navbar 这种场景，单独控制手机 / 桌面端高度
   */
  imageClassName?: string;

  /**
   * 图片路径
   */
  src?: string;

  /**
   * alt 文案
   */
  alt?: string;

  /**
   * 优先加载（Navbar 通常建议 true）
   */
  priority?: boolean;
};

function BrandLogoInner({
  height = 32,
  className = "",
  imageClassName = "",
  src = "/brand/logo-horizontal.png",
  alt,
  priority = false,
}: BrandLogoProps) {
  const logoAlt = alt || `${BRAND.displayName} logo`;

  const useResponsiveImageHeight = imageClassName.trim().length > 0;

  return (
    <div className={`inline-flex items-center ${className}`}>
      <Image
        src={src}
        alt={logoAlt}
        width={600}
        height={350}
        priority={priority}
        className={`object-contain ${imageClassName}`}
        style={
          useResponsiveImageHeight
            ? { width: "auto" }
            : {
                height: `${height}px`,
                width: "auto",
              }
        }
      />
    </div>
  );
}

export default function BrandLogo({
  clickable = true,
  ...props
}: BrandLogoProps) {
  if (!clickable) {
    return <BrandLogoInner {...props} />;
  }

  return (
    <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-90">
      <BrandLogoInner {...props} />
    </Link>
  );
}