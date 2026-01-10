// src/app/api/admin/returns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

function json(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "x-next-admin-proxy": "1", // ✅ 用于确认请求确实命中 Next route
      "cache-control": "no-store",
    },
  });
}

// ✅ 可选：兼容浏览器 preflight（有些 fetch/代理/中间件会触发）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "x-next-admin-proxy": "1",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      // ✅ 现在走 cookie，不需要 x-admin-token；保留 content-type 足够
      "access-control-allow-headers": "content-type",
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const upstream = `${WORKER_BASE}/admin/returns/${encodeURIComponent(id)}`;

  // ✅ 排查日志：证明 Next route 命中、upstream 对了
  console.log("[next /api/admin/returns/[id]] HIT id =", id);
  console.log("[next /api/admin/returns/[id]] upstream =", upstream);

  try {
    const r = await fetch(upstream, {
      method: "GET",
      headers: {
        accept: "application/json",
        // ✅ 关键：把浏览器带来的 cookie 转发给 worker
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    console.log("[next /api/admin/returns/[id]] upstream status =", r.status);

    const text = await r.text();

    // ✅ 把 worker 原样返回，同时加一个 header 证明这次走了 Next
    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
        "x-next-admin-proxy": "1",
      },
    });
  } catch (e: any) {
    // ✅ worker 断开/未启动时：返回 502，避免 Next 抛 500 导致前端跳转/循环
    console.error("[next /api/admin/returns/[id]] upstream fetch failed:", e);
    return json(
      {
        ok: false,
        error: "upstream_unreachable",
        upstream,
        detail: String(e?.message || e),
      },
      502
    );
  }
}
