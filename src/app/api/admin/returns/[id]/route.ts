// src/app/api/admin/returns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://localhost:8787";

function json(body: any, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "x-next-admin-proxy": "1", // ✅ 用于确认请求确实命中 Next route
    },
  });
}

// ✅ 可选：兼容浏览器 preflight（有些 fetch/代理/中间件会触发）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "x-next-admin-proxy": "1",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-token",
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // ✅ 关键：必须是服务端 env（不要 NEXT_PUBLIC_）
  const adminToken = (process.env.ADMIN_TOKEN || "").trim();
  if (!adminToken) {
    console.log("[next /api/admin/returns/[id]] ADMIN_TOKEN missing");
    return json({ ok: false, error: "ADMIN_TOKEN_MISSING" }, 500);
  }

  const upstream = `${API_BASE}/admin/returns/${encodeURIComponent(id)}`;

  // ✅ 排查日志：证明 Next route 命中、token 读到了、upstream 对了
  console.log("[next /api/admin/returns/[id]] HIT id =", id);
  console.log("[next /api/admin/returns/[id]] adminTokenLen =", adminToken.length);
  console.log("[next /api/admin/returns/[id]] upstream =", upstream);

  const r = await fetch(upstream, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-admin-token": adminToken, // ✅ 注入给 worker 的鉴权 header
    },
    cache: "no-store",
  });

  console.log("[next /api/admin/returns/[id]] upstream status =", r.status);

  const text = await r.text();

  // ✅ 把 worker 原样返回，同时加一个 header 证明这次走了 Next
  return new NextResponse(text, {
    status: r.status,
    headers: {
      "content-type": "application/json",
      "x-next-admin-proxy": "1",
    },
  });
}
