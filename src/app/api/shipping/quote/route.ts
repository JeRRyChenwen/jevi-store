// src/app/api/shipping/quote/route.ts
import { NextResponse } from "next/server";
import { getServerApiBase } from "@/lib/serverApiBase";

const REMOTE_BASE = getServerApiBase();

export async function POST(req: Request) {
  try {
    if (!REMOTE_BASE) {
      return NextResponse.json(
        { ok: false, error: "missing_remote_base" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 }
      );
    }

    // 透传 cookie（如果后端需要登录态/会话）
    const cookie = req.headers.get("cookie") || "";

    const upstream = await fetch(`${REMOTE_BASE}/shipping/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "proxy_error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}