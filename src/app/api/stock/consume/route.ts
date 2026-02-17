import { NextResponse } from "next/server";

const WORKER_BASE = process.env.API_PROXY || "http://127.0.0.1:8787";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const resp = await fetch(`${WORKER_BASE}/stock/consume`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => null);
    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
