// src/app/(admin)/admin/login/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* subtle background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white to-slate-50" />

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* Left: brand / info */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900" />
            <div>
              <div className="text-xl font-semibold text-slate-900">
                Admin Console
              </div>
              <div className="text-sm text-slate-500">Operations & Support</div>
            </div>
          </div>

          <ul className="mt-8 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-900" />
              Returns review & decisioning
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-900" />
              Order lookups & customer support
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-slate-900" />
              Audit trail & operational controls
            </li>
          </ul>
        </div>

        {/* Right: login card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Admin Login
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Staff only. Please sign in with your admin email.
                </p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs text-slate-600">
                Internal
              </span>
            </div>

            {/* ✅ 保持原来的登录逻辑不变：只是把表单放进卡片 */}
            <div className="mt-6">
              <AdminLoginForm next={next} />
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span>Need access? Contact an administrator.</span>
              <Link className="text-slate-700 hover:text-slate-900" href="/">
                Back to shop
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Admin Console
          </p>
        </div>
      </div>
    </div>
  );
}
