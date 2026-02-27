// src/app/api/returns/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

// 解析 sp_user（你项目里一直用的 cookie），用于兜底拿 email/id
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

    return {
      id: Number.isFinite(id as number) ? (id as number) : null,
      email,
    };
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";

  // 从 sp_user cookie 解析（可选兜底）
  const spUserRaw = req.cookies.get("sp_user")?.value || null;
  const spUser = parseSpUserCookie(spUserRaw);

  // 调 worker 的 /my/orders
  const upstreamUrl = new URL(`${API_BASE}/my/orders`);

  // 可选分页
  const sp = req.nextUrl.searchParams;
  if (sp.get("limit")) upstreamUrl.searchParams.set("limit", String(sp.get("limit")));
  if (sp.get("offset")) upstreamUrl.searchParams.set("offset", String(sp.get("offset")));

  // 额外 header（兜底/未来可用）
  const extraHeaders: Record<string, string> = {};
  if (spUser.email) extraHeaders["x-sp-user-email"] = spUser.email;
  if (spUser.id != null) extraHeaders["x-sp-user-id"] = String(spUser.id);

  try {
    const r = await fetch(upstreamUrl.toString(), {
      method: "GET",
      credentials: "include",
      headers: {
        accept: "application/json",
        cookie: cookieHeader,
        ...extraHeaders,
      } as HeadersInit,
      cache: "no-store",
    });

    // ✅ 关键：对 Return 页友好：未登录不要直接抛 401，让前端降级到游客模式
    if (r.status === 401) {
      return NextResponse.json(
        { ok: true, authed: false, email: null, orders: [] },
        { status: 200 }
      );
    }

    const data = await r.json().catch(() => ({}));

    // 非 401 的错误：也返回可降级结构（避免前端崩）
    if (!r.ok || data?.error) {
      return NextResponse.json(
        { ok: false, authed: false, error: data?.error || `upstream_${r.status}` },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        authed: true,
        email: String(data?.email || spUser.email || "").trim().toLowerCase() || null,
        orders: Array.isArray(data?.orders) ? data.orders : [],
        worker_version: data?.worker_version,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, authed: false, error: String(e?.message || e || "upstream_unavailable") },
      { status: 200 }
    );
  }
}
