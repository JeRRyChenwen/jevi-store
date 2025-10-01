// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // 前端 Navbar 用 document.cookie 查这个标记
  const has = cookies().get("sp_has_session")?.value === "1";

  // 没有登录会话时返回 204（前端就不会当作错误）
  if (!has) {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  // 有会话：可选读取一个 sp_user（非 HttpOnly）来返回用户信息
  const raw = cookies().get("sp_user")?.value;
  let user = { id: "local", email: "user@example.com", name: null as string | null };

  try {
    if (raw) {
      const u = JSON.parse(decodeURIComponent(raw));
      user = {
        id: String(u?.id ?? "local"),
        email: String(u?.email ?? "user@example.com"),
        name: u?.name ?? null,
      };
    }
  } catch {
    // 解析失败就用默认值
  }

  return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
}
