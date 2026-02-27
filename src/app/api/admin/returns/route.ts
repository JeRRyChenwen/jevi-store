// src/app/api/admin/returns/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

function upstreamHeaders(req: NextRequest) {
  // ✅ 关键：稳定让 worker 认为请求来自 localhost/http（或你真实站点）
  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";

  return {
    accept: "application/json",
    cookie: req.headers.get("cookie") || "",
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    // 可选：有些鉴权逻辑会用到 UA
    "user-agent": req.headers.get("user-agent") || "",
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const qs = url.searchParams.toString();
  const upstreamUrl = `${WORKER_BASE}/admin/returns${qs ? `?${qs}` : ""}`;

  console.log("[next /api/admin/returns] HIT");
  console.log("[next /api/admin/returns] upstream =", upstreamUrl);

  try {
    const r = await fetch(upstreamUrl, {
      method: "GET",
      headers: upstreamHeaders(req),
      cache: "no-store",
      redirect: "manual",
    });

    console.log("[next /api/admin/returns] upstream status =", r.status);

    const text = await r.text();

    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
        "x-next-admin-proxy": "1",
      },
    });
  } catch (e: any) {
    console.error("[next /api/admin/returns] upstream fetch failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_unreachable",
        detail: String(e?.message || e),
        upstream: upstreamUrl,
      },
      { status: 502, headers: { "cache-control": "no-store", "x-next-admin-proxy": "1" } }
    );
  }
}