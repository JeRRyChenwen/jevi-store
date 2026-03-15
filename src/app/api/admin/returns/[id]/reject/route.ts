// src/app/api/admin/returns/[id]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

function upstreamHeaders(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";

  const base: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    cookie: req.headers.get("cookie") || "",
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    "user-agent": req.headers.get("user-agent") || "",
  };

  const actor = req.headers.get("x-admin-actor");
  if (actor) base["x-admin-actor"] = String(actor);

  return base;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({} as any));

  const reject_reason_code = String(
    body?.reject_reason_code || body?.reason_code || ""
  ).trim();

  const reject_reason_text = String(
    body?.reject_reason_text ||
      body?.reject_reason ||
      body?.reason ||
      ""
  ).trim();

  // ✅ 兼容旧字段：继续保留 reject_reason，默认与详细说明一致；空白时传 null
  const reject_reason = reject_reason_text || null;

  if (!reject_reason_code) {
    return NextResponse.json(
      { ok: false, error: "reject_reason_code_required" },
      { status: 400, headers: { "cache-control": "no-store", "x-next-admin-proxy": "1" } }
    );
  }

  // ✅ 详情默认可空；只有 other 时才要求填写
  if (reject_reason_code === "other" && !reject_reason_text) {
    return NextResponse.json(
      { ok: false, error: "reject_reason_text_required" },
      { status: 400, headers: { "cache-control": "no-store", "x-next-admin-proxy": "1" } }
    );
  }

  // ✅ 与前端/worker 保持一致：other 时要求更详细说明
  if (reject_reason_code === "other" && reject_reason_text.length < 8) {
    return NextResponse.json(
      { ok: false, error: "reject_reason_text_too_short" },
      { status: 400, headers: { "cache-control": "no-store", "x-next-admin-proxy": "1" } }
    );
  }

  const upstream = `${WORKER_BASE}/admin/returns/${encodeURIComponent(id)}/reject`;

  try {
    const r = await fetch(upstream, {
      method: "POST",
      headers: upstreamHeaders(req),
      body: JSON.stringify({
        reject_reason_code,
        reject_reason_text: reject_reason_text || null,
        reject_reason,
      }),
      cache: "no-store",
      redirect: "manual",
    });

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