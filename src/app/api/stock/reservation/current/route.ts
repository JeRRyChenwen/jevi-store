import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const WORKER_BASE = process.env.API_PROXY || "http://localhost:8787";

export async function GET() {
  try {
    const jar = await cookies();
    const checkoutSessionId = jar.get("checkout_session_id")?.value || "";

    // ✅ 如果没有 cookie，就直接返回 found:false
    if (!checkoutSessionId) {
      return NextResponse.json({ ok: true, found: false }, { status: 200 });
    }

    const resp = await fetch(
      `${WORKER_BASE}/stock/reservation/current?checkout_session_id=${encodeURIComponent(checkoutSessionId)}`,
      { method: "GET" }
    );

    const data = await resp.json().catch(() => null);
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
