// src/app/api/site/context/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  FALLBACK_SITE_CONTEXT,
  normalizeSiteContext,
} from "@/lib/market/site-context";
import { CURRENT_STOREFRONT } from "@/lib/market/current";

export const runtime = "nodejs";

function getApiBase() {
  return (
    process.env.API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    ""
  ).trim().replace(/\/+$/, "");
}

export async function GET(req: NextRequest) {
  const fallbackContext = {
    ...FALLBACK_SITE_CONTEXT,
    storefront_code: CURRENT_STOREFRONT.code,
  };

  try {
    const apiBase = getApiBase();

    // 如果还没配置后端 API_BASE，就先直接返回本地 fallback
    if (!apiBase) {
      return NextResponse.json({
        ok: true,
        context: fallbackContext,
        source: "fallback:no_api_base",
      });
    }

    const upstreamUrl = `${apiBase}/site/context`;

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-storefront-code": CURRENT_STOREFRONT.code,
      },
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error(
        "[api/site/context] upstream failed:",
        upstream.status,
        data
      );

      return NextResponse.json({
        ok: true,
        context: fallbackContext,
        source: "fallback:upstream_not_ok",
      });
    }

    /**
     * 兼容两种后端返回：
     * A) 直接返回 context 对象
     * B) { ok:true, context:{...} }
     */
    const rawContext = data?.context ?? data;
    const context = normalizeSiteContext({
      ...fallbackContext,
      ...rawContext,
    });

    return NextResponse.json({
      ok: true,
      context,
      source: "upstream",
    });
  } catch (e: any) {
    console.error("[api/site/context] exception:", e?.message || e);

    return NextResponse.json({
      ok: true,
      context: fallbackContext,
      source: "fallback:exception",
    });
  }
}