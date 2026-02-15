import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function POST(req: NextRequest) {
  const upstreamUrl = `${WORKER_BASE}/admin/inventory/sync`;
  const bodyText = await req.text().catch(() => "{}");

  try {
    const r = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") || "",
        "content-type": "application/json",
      },
      body: bodyText || "{}",
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
      { ok: false, error: "upstream_unreachable", detail: String(e?.message || e), upstream: upstreamUrl },
      { status: 502 }
    );
  }
}
