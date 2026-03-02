// src/app/api/admin/orders/[id]/shipment/route.ts
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
    authorization: req.headers.get("authorization") || "",
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    "user-agent": req.headers.get("user-agent") || "",
  };
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const id = String(ctx?.params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const upstream = `${WORKER_BASE}/admin/orders/${encodeURIComponent(id)}/shipment`;
  const body = await req.text();

  const r = await fetch(upstream, {
    method: "PATCH",
    headers: upstreamHeaders(req),
    body,
    cache: "no-store",
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });
}