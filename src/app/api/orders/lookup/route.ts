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

  // ✅ 直接转发到 Worker 的 /orders/lookup
  //    Worker 端会负责：
  //    - 根据 orderNumber / email 精确匹配订单
  //    - 一次性查出 order + items
  const upstreamUrl =
    `${API_BASE}/orders/lookup` +
    `?orderNumber=${encodeURIComponent(orderNumber)}` +
    `&email=${encodeURIComponent(email)}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
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
      },
      { status }
    );
  }

  // ✅ 把 order + items 直接透传给前端 ReturnsPage 使用
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
