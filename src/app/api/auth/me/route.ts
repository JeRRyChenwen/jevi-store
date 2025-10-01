// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 简单：有 sp_has_session 才认为登录
  const has = req.cookies.get("sp_has_session")?.value === "1";
  if (!has) return new NextResponse(null, { status: 204 });

  // demo：从 sp_user 里取点信息返回（真实项目建议只返回后端查到的用户）
  const raw = req.cookies.get("sp_user")?.value;
  if (!raw) return new NextResponse(null, { status: 204 });

  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const user = JSON.parse(json);
    return NextResponse.json(user, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
