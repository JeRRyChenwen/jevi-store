// src/app/api/my/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerApiBase } from "@/lib/serverApiBase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = getServerApiBase();

function buildUpstreamHeaders(req: NextRequest) {
  const headers = new Headers();

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const userAgent = req.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  const acceptLanguage = req.headers.get("accept-language");
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);

  headers.set("accept", "application/json");

  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const upstreamUrl = new URL(`${API_BASE}/my/orders`);

    req.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: buildUpstreamHeaders(req),
      cache: "no-store",
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_fetch_failed",
        message: String(e?.message || e),
      },
      { status: 500 }
    );
  }
}