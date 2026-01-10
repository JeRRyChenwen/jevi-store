// src/app/api/admin/returns/route.ts
import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787"; // 本地 d1-worker dev 地址

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // 透传 query：status/page/page_size
  const qs = url.searchParams.toString();
  const upstreamUrl = `${WORKER_BASE}/admin/returns${qs ? `?${qs}` : ""}`;

  try {
    const r = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        // ✅ 关键：把浏览器带来的 cookie 转发给 worker
        cookie: req.headers.get("cookie") || "",
      },
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
    // ✅ worker 断开/未启动时，不要直接让 Next 抛 500（会导致前端循环跳转）
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_unreachable",
        detail: String(e?.message || e),
        upstream: upstreamUrl,
      },
      { status: 502 }
    );
  }
}
