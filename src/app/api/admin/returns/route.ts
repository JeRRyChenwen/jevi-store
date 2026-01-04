// src/app/api/admin/returns/route.ts
import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787"; // 本地 d1-worker dev 地址

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // 透传 query：status/page/page_size
  const qs = url.searchParams.toString();
  const upstreamUrl = `${WORKER_BASE}/admin/returns${qs ? `?${qs}` : ""}`;

  const adminToken = process.env.ADMIN_TOKEN || "";
  if (!adminToken) {
    return NextResponse.json(
      { ok: false, error: "missing_admin_token" },
      { status: 500 }
    );
  }

  const r = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      "x-admin-token": adminToken,
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
}
