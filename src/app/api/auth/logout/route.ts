// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

const SECURE_COOKIE = process.env.NODE_ENV === "production";

function clearCookies() {
  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  // 清除会话存在信号
  res.cookies.set({
    name: "sp_has_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: SECURE_COOKIE,
    maxAge: 0, // 立即过期
  });

  // 清除前端可读的用户信息（仅开发演示使用）
  res.cookies.set({
    name: "sp_user",
    value: "",
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: SECURE_COOKIE,
    maxAge: 0,
  });

  return res;
}

export async function POST() {
  return clearCookies();
}

// 兜底：如果用 GET 调用退出，也一并支持
export async function GET() {
  return clearCookies();
}
