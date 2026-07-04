// src/app/api/subscribe/route.ts
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
  headers.set("content-type", "application/json");

  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();

    const upstream = await fetch(`${API_BASE}/subscribe`, {
      method: "POST",
      headers: buildUpstreamHeaders(req),
      body: bodyText,
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