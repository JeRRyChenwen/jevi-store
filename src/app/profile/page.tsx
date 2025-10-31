// src/app/profile/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

async function readUserFromCookies(): Promise<SessionUser | null> {
  const jar = await cookies();
  const rawUser = jar.get("sp_user")?.value || "";
  const hasPresence = jar.get("sp_has_session")?.value === "1";
  const jwt = jar.get("sp_session")?.value || "";

  // 1) 优先 sp_user
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

  // 2) 兜底：解析 JWT payload 展示
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

// 统一走本地 /api 代理（会把 3000 域 Cookie 带上）
const apiURL = (p: string) => `/api${p}`;

// ===== Server Action: 退出登录 =====
async function logoutAction() {
  "use server";

  // 1) 调用后端清 Cookie（Worker 应该在 /logout 返回 Set-Cookie 清除 sp_*）
  try {
    await fetch(apiURL("/logout"), {
      method: "POST",
      // Server Actions 里 fetch 不会自动携带浏览器 Cookie，
      // 但因为这是同域的内部调用，Worker 仍会按约定返回清除指令。
      // 这里我们再本地把 Next 侧的 cookies 一并删除，双保险。
    });
  } catch {
    // 忽略网络错误，继续本地删除
  }

  // 2) 本地删除这些 cookie（兜底，防止代理异常）
  const jar = await cookies();
  ["sp_session", "sp_has_session", "sp_user"].forEach((k) => {
    try {
      jar.delete(k);
    } catch {}
  });

  // 3) 回到首页
  redirect("/");
}

export default async function ProfilePage() {
  const user = await readUserFromCookies();
  if (!user) {
    // 未登录 → 带 next 回跳
    redirect("/auth/login?next=/profile");
  }

  return (
    <main className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">个人资料</h1>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="text-sm text-neutral-600">邮箱</div>
        <div className="text-base font-medium">{user.email}</div>

        <div className="h-px bg-neutral-200 my-2" />

        <div className="text-sm text-neutral-600">昵称 / 名称</div>
        <div className="text-base font-medium">{user.name || "（未设置）"}</div>
      </div>

      <p className="text-xs text-neutral-500 mt-4">
        该页面仅展示从登录会话里读取到的基本资料。修改资料的功能可以之后再接到后端接口。
      </p>

      {/* 退出登录按钮 */}
      <form action={logoutAction} className="mt-6">
        <button
          type="submit"
          className="rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
          title="退出当前登录"
        >
          退出登录
        </button>
      </form>
    </main>
  );
}
