import { NextRequest, NextResponse } from "next/server";

const WORKER_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${WORKER_BASE}/admin/auth/login`, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") || "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();

  const res = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });

  // ✅ 关键：把 worker 的 set-cookie 透传给浏览器
  const anyHeaders = upstream.headers as any;
  const setCookies: string[] =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : (upstream.headers.get("set-cookie")
          ? [upstream.headers.get("set-cookie") as string]
          : []);

  for (const c of setCookies) {
    res.headers.append("set-cookie", c);
  }

  return res;
}
