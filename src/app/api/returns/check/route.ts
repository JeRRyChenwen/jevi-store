// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") || "http://127.0.0.1:8787";

function parseSpUserCookie(raw?: string | null): { id?: number | null; email?: string | null } {
  if (!raw) return {};
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const obj = JSON.parse(json);
    const id =
      obj && typeof obj.id !== "undefined"
        ? Number(obj.id)
        : obj && typeof obj.user_id !== "undefined"
        ? Number(obj.user_id)
        : null;
    const email =
      obj && typeof obj.email === "string" ? obj.email.trim().toLowerCase() : null;
    return { id: Number.isFinite(id as number) ? (id as number) : null, email };
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  // 组装上游 URL
  const url = `${API_BASE}/orders`;

  // 读取原始 body
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // 从本地域 Cookie 解析 sp_user
  const spUserRaw = req.cookies.get("sp_user")?.value || null;
  const spUser = parseSpUserCookie(spUserRaw);

  // 如果前端没填 email，这里补齐；同时把 user_id 也带过去（可选）
  if (!body.email && spUser.email) body.email = spUser.email;
  if (spUser.id != null && body.user_id == null) body.user_id = spUser.id;

  // 把浏览器在 3000 域上的 Cookie 也一并转发（sp_has_session/sp_user）
  const cookieHeader = req.headers.get("cookie") || "";

  // 额外加一个显式头，方便 Worker 再兜底
  const extraHeaders: Record<string, string> = {};
  if (spUser.email) extraHeaders["x-sp-user-email"] = spUser.email;
  if (spUser.id != null) extraHeaders["x-sp-user-id"] = String(spUser.id);

  let upstream: Response | null = null;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader, // 透传本地域 cookie（虽然没 sp_session，但有 sp_user）
        ...extraHeaders,
        accept: "application/json",
      } as HeadersInit,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "upstream unavailable" }, { status: 502 });
  }

  // 构造下游响应
  const out = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
  return out;
}
