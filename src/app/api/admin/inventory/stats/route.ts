import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search || "";
  const upstreamUrl = `${WORKER_BASE}/admin/inventory/stats${search}`;

  try {
    const r = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") || "",
        accept: "application/json",
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