// src/app/api/admin/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

export async function POST(req: NextRequest) {
  const upstream = await fetch(`${API_BASE}/admin/auth/logout`, {
    method: "POST",
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
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

  // ✅ 1) 透传 worker 的 set-cookie（如果 worker 用 Set-Cookie 清理的话）
  const anyHeaders = upstream.headers as any;
  const setCookies: string[] =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : upstream.headers.get("set-cookie")
      ? [upstream.headers.get("set-cookie") as string]
      : [];

  for (const c of setCookies) {
    res.headers.append("set-cookie", c);
  }

  // ✅ 2) 保险：在 Next 这一层强制清 sp_admin（即使 worker 没发 set-cookie 也能清掉）
  // 注意：Path 必须覆盖到你当初写 cookie 的 Path（通常是 /）
  res.headers.append(
    "set-cookie",
    [
      "sp_admin=",
      "Path=/",
      "Max-Age=0",
      "HttpOnly",
      "SameSite=Lax",
    ].join("; ")
  );

  return res;
}
