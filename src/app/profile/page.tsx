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
  // ✅ 关键：在新版本里要 await cookies()
  const jar = await cookies();
  const rawUser = jar.get("sp_user")?.value || "";
  const hasPresence = jar.get("sp_has_session")?.value === "1";
  const jwt = jar.get("sp_session")?.value || "";

  // 1) 优先使用 sp_user
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
    } catch {
      // 解析失败则降级到 JWT
    }
  }

  // 2) 兜底：从 sp_session(JWT) 的 payload 解出展示用信息（不做签名校验）
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
      } catch {
        // 忽略
      }
    }
  }

  return null;
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
    </main>
  );
}
