// src/app/api/checkout/sessions/[sessionToken]/paypal/create-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerApiBase } from "@/lib/serverApiBase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = getServerApiBase();

type RouteContext = {
  params: Promise<{
    sessionToken: string;
  }>;
};

function buildUpstreamHeaders(req: NextRequest) {
  const headers = new Headers();

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const authorization = req.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const userAgent = req.headers.get("user-agent");
  if (userAgent) headers.set("user-agent", userAgent);

  const acceptLanguage = req.headers.get("accept-language");
  if (acceptLanguage) headers.set("accept-language", acceptLanguage);

  headers.set("accept", "application/json");
  headers.set("content-type", "application/json");

  return headers;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { sessionToken } = await ctx.params;
    const safeSessionToken = encodeURIComponent(String(sessionToken || ""));
    const bodyText = await req.text();

    const upstreamUrl = new URL(
      `${API_BASE}/checkout/sessions/${safeSessionToken}/paypal/create-order`
    );

    req.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers: buildUpstreamHeaders(req),
      body: bodyText || "{}",
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
    console.error(
      "[api/checkout/sessions/[sessionToken]/paypal/create-order] upstream failed:",
      e
    );

    return NextResponse.json(
      {
        ok: false,
        error: "upstream_fetch_failed",
        message: "Failed to forward PayPal create-order request to jevi-api.",
        detail: String(e?.message || e),
        apiBase: API_BASE,
      },
      { status: 500 }
    );
  }
}