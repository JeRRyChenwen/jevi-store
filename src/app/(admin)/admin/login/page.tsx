// src/app/(admin)/admin/login/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLoginForm from "./AdminLoginForm";

function safeNext(raw: string | null) {
  if (!raw) return "/admin/returns";
  if (!raw.startsWith("/")) return "/admin/returns";
  if (raw.startsWith("//")) return "/admin/returns";
  if (raw.includes("\\")) return "/admin/returns";
  return raw;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // ✅ Next 15：searchParams 要 await
  const sp = await searchParams;

  const next = safeNext(sp?.next ?? null);

  // ✅ Next 15：cookies() 要 await
  const cookieStore = await cookies();
  const hasAdminCookie = cookieStore.get("sp_admin")?.value;

  // 有 cookie 就直接回跳（不打 /me）
  if (hasAdminCookie) {
    redirect(next);
  }

  return <AdminLoginForm next={next} />;
}
