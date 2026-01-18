// src/app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${WORKER_BASE}/auth/change-password`, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") || "application/json",
      cookie: req.headers.get("cookie") || "", // ✅ 带上登录 cookie
    },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}
