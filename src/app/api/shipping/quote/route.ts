// src/app/api/shipping/quote/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const REMOTE_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
    if (!REMOTE_BASE) {
      return NextResponse.json(
        { ok: false, error: "missing_NEXT_PUBLIC_API_BASE" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    // ✅ 透传 cookie（如果 worker 需要登录态/会话）
    const cookie = req.headers.get("cookie") || "";

    const upstream = await fetch(`${REMOTE_BASE}/shipping/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text(); // 先读文本，避免上游返回非 JSON 导致报错

    // ✅ 把 upstream 的 status 原样返回
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "proxy_error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
