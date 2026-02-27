// src/app/api/admin/returns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

function json(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "x-next-admin-proxy": "1",
      "cache-control": "no-store",
    },
  });
}

function upstreamHeaders(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";

  return {
    accept: "application/json",
    cookie: req.headers.get("cookie") || "",
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    "user-agent": req.headers.get("user-agent") || "",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "x-next-admin-proxy": "1",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
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

  console.log("[next /api/admin/returns/[id]] HIT id =", id);
  console.log("[next /api/admin/returns/[id]] upstream =", upstream);

  try {
    const r = await fetch(upstream, {
      method: "GET",
      headers: upstreamHeaders(req),
      cache: "no-store",
      redirect: "manual",
    });

    console.log("[next /api/admin/returns/[id]] upstream status =", r.status);

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