// src/app/api/admin/returns/[id]/attachments/[attId]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; attId: string }> }
) {
  const { id, attId } = await ctx.params;

  const upstream = `${WORKER_BASE}/returns/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attId)}`;

  try {
    const r = await fetch(upstream, {
      method: "GET",
      headers: {
        // 二进制也行
        accept: "*/*",
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    const ab = await r.arrayBuffer();

    return new NextResponse(ab, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/octet-stream",
        "cache-control": "no-store",
        "x-next-admin-proxy": "1",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "upstream_unreachable", detail: String(e?.message || e), upstream },
      { status: 502, headers: { "cache-control": "no-store", "x-next-admin-proxy": "1" } }
    );
  }
}