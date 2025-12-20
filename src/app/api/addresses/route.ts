// src/app/api/addresses/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

// 强制不要缓存（避免地址更新后页面仍读到旧数据）
export const dynamic = "force-dynamic";

function buildUpstreamHeaders(req: NextRequest) {
  const h = new Headers();

  // ✅ 关键：把浏览器带来的 cookie 透传给 Worker
  const cookie = req.headers.get("cookie");
  if (cookie) h.set("cookie", cookie);

  // 透传常用 header
  const ua = req.headers.get("user-agent");
  if (ua) h.set("user-agent", ua);

  h.set("accept", "application/json");

  return h;
}

export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(`${API_BASE}/addresses`, {
      method: "GET",
      headers: buildUpstreamHeaders(req),
      cache: "no-store",
    });

    const text = await upstream.text(); // ✅ 先用 text，避免 json() 因为非 JSON 直接 throw

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "upstream_fetch_failed", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();

    const upstream = await fetch(`${API_BASE}/addresses`, {
      method: "POST",
      headers: {
        ...Object.fromEntries(buildUpstreamHeaders(req)),
        "content-type": "application/json",
      },
      body: bodyText,
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "upstream_fetch_failed", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
