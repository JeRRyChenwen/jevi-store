// src/components/brand/AuthLogo.tsx
import BrandLogo from "@/components/brand/BrandLogo";

/**
 * ✅ Auth 专用 Logo
 * 用于：
 * - 登录页
 * - 注册页
 * - 忘记密码页
 *
 * 以后如果你想单独调整 Auth 区域的 Logo：
 * - 高度
 * - 图片路径
 * - 是否 clickable
 * 都只改这个文件即可
 */
export default function AuthLogo() {
  return (
    <BrandLogo
      src="/brand/logo-600-350.png"
      height={62}
      priority
    />
  );
}