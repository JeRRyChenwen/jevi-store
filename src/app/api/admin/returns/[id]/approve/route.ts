import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const adminToken = (process.env.ADMIN_TOKEN || "").trim();
  if (!adminToken) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_TOKEN_MISSING" },
      { status: 500 }
    );
  }

  const upstream = `${API_BASE}/admin/returns/${encodeURIComponent(id)}/approve`;

  const r = await fetch(upstream, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-admin-token": adminToken,
    },
    // approve 目前不需要 body 也可以发空对象
    body: JSON.stringify({}),
    cache: "no-store",
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}
