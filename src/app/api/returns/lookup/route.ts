// src/app/api/orders/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  // ✅ 同时兼容 order_number 和 orderNumber（前端 query 可以用任意一种）
  const orderNumber =
    (sp.get("order_number") || sp.get("orderNumber") || "").trim();
  const email = (sp.get("email") || "").trim().toLowerCase();

  if (!orderNumber || !email) {
    return NextResponse.json(
      { ok: false, error: "missing_params" },
      { status: 400 }
    );
  }

  // ✅ 更稳：上游同时传 order_number + orderNumber（双保险）
  const upstreamUrl =
    `${API_BASE}/orders/lookup` +
    `?order_number=${encodeURIComponent(orderNumber)}` +
    `&orderNumber=${encodeURIComponent(orderNumber)}` +
    `&email=${encodeURIComponent(email)}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "upstream_unavailable" },
      { status: 502 }
    );
  }

  let data: any = null;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_upstream_json" },
      { status: 502 }
    );
  }

  // Worker 约定：
  // - 找不到时返回 { ok:false, error:"not_found" } + 404
  // - 找到时返回 { ok:true, order, items, worker_version }
  if (!upstream.ok || !data?.ok || !data.order) {
    const status = upstream.status || 502;
    return NextResponse.json(
      {
        ok: false,
        error: data?.error || "lookup_failed",
        // ✅ 增强调试：你本地看 Network 就能知道上游到底回了什么
        upstream_status: upstream.status,
        upstream_error: data?.error,
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      order: data.order,
      items: Array.isArray(data.items) ? data.items : [],
      worker_version: data.worker_version,
    },
    { status: 200 }
  );
}
