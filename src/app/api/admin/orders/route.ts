// src/app/api/admin/orders/route.ts
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
    cookie: req.headers.get("cookie") || "",
    authorization: req.headers.get("authorization") || "",
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    "user-agent": req.headers.get("user-agent") || "",
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const qs = url.searchParams.toString();

  const upstream = `${WORKER_BASE}/admin/orders${qs ? `?${qs}` : ""}`;

  const r = await fetch(upstream, {
    method: "GET",
    headers: upstreamHeaders(req),
    cache: "no-store",
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": r.headers.get("content-type") || "application/json" },
  });
}