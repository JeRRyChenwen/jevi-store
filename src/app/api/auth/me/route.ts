// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const hasPresence = req.cookies.get("sp_has_session")?.value === "1";
  const rawUser = req.cookies.get("sp_user")?.value || "";

  // 只要有 sp_user 就返回 200；两者皆无则 204
  if (!hasPresence && !rawUser) {
    return new NextResponse(null, { status: 204 });
  }

  if (rawUser) {
    try {
      const json = Buffer.from(rawUser, "base64").toString("utf8");
      const user = JSON.parse(json);
      return NextResponse.json(user, { status: 200 });
    } catch {
      // 解析失败就当未登录
      return new NextResponse(null, { status: 204 });
    }
  }

  return new NextResponse(null, { status: 204 });
}
