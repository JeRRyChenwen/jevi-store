// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";

/** base64url -> string */
function b64urlToString(input: string): string {
  try {
    let s = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4;
    if (pad) s += "=".repeat(4 - pad);
    return Buffer.from(s, "base64").toString("utf8");
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const resHeaders = { "Cache-Control": "no-store" as const };

  const hasPresence = req.cookies.get("sp_has_session")?.value === "1";
  const rawUser = req.cookies.get("sp_user")?.value || "";
  const jwt = req.cookies.get("sp_session")?.value || "";

  // 1) 首选：如果有 sp_user（开发/演示时前端可写入的用户信息）
  if (rawUser) {
    try {
      const json = Buffer.from(rawUser, "base64").toString("utf8");
      const user = JSON.parse(json);
      // 统一格式：只返回最小集，避免泄漏其它字段
      const shaped = {
        id: user?.id ?? null,
        email: typeof user?.email === "string" ? user.email : null,
        name: typeof user?.name === "string" ? user.name : null,
      };
      if (shaped.email) {
        return NextResponse.json(shaped, { status: 200, headers: resHeaders });
      }
      // 没邮箱就当未登录（前端展示需要 email 作为标识）
      return new NextResponse(null, { status: 204, headers: resHeaders });
    } catch {
      // 解析失败降级到 JWT 兜底
    }
  }

  // 2) 兜底：如果仅有 sp_session（JWT），尝试**只解码 payload**得到 {sub,email,name}
  if (hasPresence && jwt) {
    const parts = jwt.split(".");
    if (parts.length === 3) {
      const payloadStr = b64urlToString(parts[1] || "");
      try {
        const payload = JSON.parse(payloadStr) as any;
        const shaped = {
          id: payload?.sub ?? null,
          email: typeof payload?.email === "string" ? payload.email : null,
          name: typeof payload?.name === "string" ? payload.name : null,
        };
        if (shaped.email) {
          return NextResponse.json(shaped, { status: 200, headers: resHeaders });
        }
      } catch {
        // 解码失败则继续走未登录分支
      }
    }
  }

  // 3) 没有任何有效身份信息 → 204（让客户端把它当“未登录”）
  return new NextResponse(null, { status: 204, headers: resHeaders });
}
