// src/app/api/admin/returns/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

function upstreamHeaders(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";

  return {
    accept: "application/json",
    "content-type": "application/json",
    cookie: req.headers.get("cookie") || "",
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    "user-agent": req.headers.get("user-agent") || "",
  };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const upstream = `${WORKER_BASE}/admin/returns/${encodeURIComponent(id)}/approve`;

  try {
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch {
      bodyText = "";
    }
    const body =
      bodyText && bodyText.trim().length > 0 ? bodyText : JSON.stringify({});

    const r = await fetch(upstream, {
      method: "POST",
      headers: upstreamHeaders(req),
      body,
      cache: "no-store",
      redirect: "manual",
    });

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
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_unreachable",
        upstream,
        detail: String(e?.message || e),
      },
      { status: 502, headers: { "cache-control": "no-store", "x-next-admin-proxy": "1" } }
    );
  }
}