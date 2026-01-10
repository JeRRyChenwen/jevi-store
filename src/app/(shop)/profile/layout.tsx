// src/app/profile/layout.tsx
// 重要：不要加 "use client" —— 这样 /profile 下的 page.tsx 默认是服务端组件
export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
