// src/app/api/admin/returns/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // ✅ 读取前端传来的 reject_reason
  const body = await req.json().catch(() => ({} as any));
  const reject_reason = String(body?.reject_reason || "").trim();

  if (!reject_reason) {
    return NextResponse.json(
      { ok: false, error: "reject_reason_required" },
      { status: 400, headers: { "cache-control": "no-store" } }
    );
  }

  const upstream = `${WORKER_BASE}/admin/returns/${encodeURIComponent(id)}/reject`;

  try {
    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",

        // ✅ 关键：把浏览器 cookie 转发给 worker，用于 session 鉴权
        cookie: req.headers.get("cookie") || "",

        // ✅ 可选：把操作者透传给 d1-worker（不推荐长期依赖，但可先保留）
        ...(req.headers.get("x-admin-actor")
          ? { "x-admin-actor": String(req.headers.get("x-admin-actor")) }
          : {}),
      },
      body: JSON.stringify({ reject_reason }),
      cache: "no-store",
    });

    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    // ✅ worker 断开/未启动时：避免 Next 抛 500 导致前端跳转/循环
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_unreachable",
        upstream,
        detail: String(e?.message || e),
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}
