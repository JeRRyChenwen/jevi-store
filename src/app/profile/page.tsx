// src/app/profile/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAction } from "./_actions";
import EditProfileCard from "./EditProfileCard";
import {
  User as UserIcon,
  ShoppingBag,
  MapPin,
  Mail,
  ChevronDown,
} from "lucide-react";
import EditOrdersCard from "./EditOrdersCard";

/** base64url -> string */
function b64urlToString(input: string): string {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4;
    if (pad) s += "=".repeat(4 - pad);
    return Buffer.from(s, "base64").toString("utf8");
  } catch {
    return "";
  }
}

type SessionUser = {
  id: string | number | null;
  email: string | null;
  name: string | null;
};

/** 读取本次请求 Cookie（你的类型里 cookies() 是 Promise，所以这里用 await） */
async function readUserFromCookies(): Promise<SessionUser | null> {
  const jar = await cookies();
  const rawUser = jar.get("sp_user")?.value || "";
  const hasPresence = jar.get("sp_has_session")?.value === "1";
  const jwt = jar.get("sp_session")?.value || "";

  // 1) 优先 sp_user（base64 JSON）
  if (rawUser) {
    try {
      const json = Buffer.from(rawUser, "base64").toString("utf8");
      const u = JSON.parse(json);
      const shaped: SessionUser = {
        id: u?.id ?? null,
        email: typeof u?.email === "string" ? u.email : null,
        name: typeof u?.name === "string" ? u.name : null,
      };
      if (shaped.email) return shaped;
    } catch {}
  }

  // 2) 兜底：解析 JWT payload
  if (hasPresence && jwt) {
    const parts = jwt.split(".");
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(b64urlToString(parts[1] || "")) as any;
        const shaped: SessionUser = {
          id: payload?.sub ?? null,
          email: typeof payload?.email === "string" ? payload.email : null,
          name: typeof payload?.name === "string" ? payload.name : null,
        };
        if (shaped.email) return shaped;
      } catch {}
    }
  }
  return null;
}

/** 服务端携带当前请求 Cookie 调同域 API */
async function apiGet<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(path, {
    method: "GET",
    headers: { accept: "application/json", cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail: any = null;
    try {
      detail = await res.json();
    } catch {}
    throw new Error(
      `GET ${path} failed: ${res.status} ${res.statusText} ${detail ? JSON.stringify(detail) : ""}`
    );
  }
  return (await res.json()) as T;
}

type MeResp = {
  ok: boolean;
  user: { id: number; email: string | null; name: string | null } | null;
  worker_version?: string;
};

export default async function ProfilePage() {
  // A) 从 cookie 读取
  let user = await readUserFromCookies();
  if (!user) {
    redirect("/auth/login?next=/profile");
  }

  // B) cookie 没有 name → 调 /api/auth/me 补全
  if (user && (!user.name || !user.name.trim())) {
    try {
      const me = await apiGet<MeResp>("/api/auth/me");
      if (me?.ok && me.user?.email) {
        user = {
          id: me.user.id ?? user.id,
          email: me.user.email ?? user.email,
          name: (me.user.name ?? "").trim() || user.email?.split("@")[0] || null,
        };
      }
    } catch {
      // 忽略错误，回退邮箱前缀
      user = {
        ...user!,
        name: user?.name?.trim() || user?.email?.split("@")[0] || null,
      };
    }
  }

  const displayName =
    (user?.name || "").trim() || (user?.email ? user.email.split("@")[0] : "") || "User";

  // 从 name 粗略猜测 first/last（仅用于 EditProfileCard 初值）
  const [guessedFirst, guessedLast] = (() => {
    const n = (user?.name || "").trim();
    if (!n) return ["", ""];
    const parts = n.split(/\s+/);
    return [parts[0] || "", parts.slice(1).join(" ") || ""];
  })();

  // === UI：保持你的原有结构，Orders 信息渲染在 Orders 折叠里 ===
  return (
    <main className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Hi, {displayName}</h1>

      {/* 个人信息（摘要） */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="text-sm text-neutral-600">邮箱</div>
        <div className="text-base font-medium">{user?.email}</div>

        <div className="h-px bg-neutral-200 my-2" />

        <div className="text-sm text-neutral-600">昵称 / 名称</div>
        <div className="text-base font-medium">{displayName || "（未设置）"}</div>
      </div>

      <p className="text-xs text-neutral-500 mt-4">
        该页面仅展示从登录会话/后端读取到的基本资料。修改资料的功能可以之后再接到后端接口。
      </p>

      {/* 折叠区块 */}
      <div className="mt-6 border rounded-lg divide-y">
        {/* Profile */}
        <details open className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-neutral-50">
            <span className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-neutral-700" />
              <span>Profile</span>
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500 group-open:rotate-180 transition-transform" />
          </summary>

          <EditProfileCard
            initialFirstName={guessedFirst}
            initialLastName={guessedLast}
            initialEmail={user?.email || ""}
          />
        </details>

        {/* Orders —— 在该折叠里渲染订单信息 */}
        <details open className="group">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-neutral-50">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-neutral-700" />
              <span>Orders</span>
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-500 group-open:rotate-180 transition-transform" />
          </summary>
          <EditOrdersCard />
        </details>

        {/* 其他占位 */}
        {[{ label: "Delivery Address", icon: MapPin }, { label: "Subscriptions", icon: Mail }].map(
          (item) => {
            const Icon = item.icon;
            return (
              <details key={item.label} className="group">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-neutral-700" />
                    <span>{item.label}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-neutral-500 group-open:rotate-180 transition-transform" />
                </summary>
              </details>
            );
          }
        )}
      </div>

      {/* 退出登录 */}
      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          退出登录
        </button>
      </form>
    </main>
  );
}
