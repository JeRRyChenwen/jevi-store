// src/app/api/admin/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Agent } from "undici";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ✅ 强制 Node fetch 走 IPv4（避免 localhost -> ::1 导致 ECONNREFUSED）
 */
const dispatcher = new Agent({
  connect: { family: 4 },
});

/**
 * ✅ 把 localhost / [::1] 统一改成 127.0.0.1
 * ✅ 同时去掉末尾 /
 */
function normalizeBase(input: string) {
  const s = String(input || "").trim();
  if (!s) return "";
  return s
    .replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1")
    .replace(/^https:\/\/localhost(?=[:/]|$)/i, "https://127.0.0.1")
    .replace(/^http:\/\/\[\:\:1\](?=[:/]|$)/i, "http://127.0.0.1")
    .replace(/^https:\/\/\[\:\:1\](?=[:/]|$)/i, "https://127.0.0.1")
    .replace(/\/+$/, "");
}

/**
 * ✅ 优先用 NEXT_PUBLIC_API_BASE（你现在就是这样）
 * 但会被 normalizeBase 强制改成 127.0.0.1
 */
const WORKER_BASE = normalizeBase(process.env.NEXT_PUBLIC_API_BASE || "") || "http://127.0.0.1:8787";

function upstreamHeaders(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";

  return {
    accept: "application/json",
    cookie: req.headers.get("cookie") || "",
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    "user-agent": req.headers.get("user-agent") || "",
  };
}

export async function GET(req: NextRequest) {
  const upstream = `${WORKER_BASE}/admin/auth/me`;

  console.log("[next /api/admin/auth/me] HIT upstream =", upstream);

  try {
    const r = await fetch(upstream, {
      method: "GET",
      headers: upstreamHeaders(req),
      cache: "no-store",
      redirect: "manual",
      // ✅ 关键：强制 IPv4
      dispatcher,
    } as any);

    console.log("[next /api/admin/auth/me] upstream status =", r.status);

    const text = await r.text();

    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
        "x-next-admin-proxy": "1",
      },
    });
  } catch (e: any) {
    console.error("[next /api/admin/auth/me] upstream fetch failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error: "upstream_unreachable",
        upstream,
        detail: String(e?.message || e),
      },
      { status: 502, headers: { "cache-control": "no-store", "x-next-admin-proxy": "1" } }
    );
  }
}