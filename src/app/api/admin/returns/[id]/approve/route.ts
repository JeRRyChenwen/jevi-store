// src/app/api/admin/returns/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const upstream = `${WORKER_BASE}/admin/returns/${encodeURIComponent(id)}/approve`;

  try {
    // ✅ 允许未来扩展：前端如果传 body，就透传；不传则发 {}
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch {
      bodyText = "";
    }
    const body = bodyText && bodyText.trim().length > 0 ? bodyText : JSON.stringify({});

    const r = await fetch(upstream, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        // ✅ 关键：把浏览器 cookie 转发给 worker，用于 session 鉴权
        cookie: req.headers.get("cookie") || "",
      },
      body,
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
      { status: 502 }
    );
  }
}
