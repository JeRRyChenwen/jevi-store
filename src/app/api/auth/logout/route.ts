// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

const SECURE_COOKIE = process.env.NODE_ENV === "production";

/** 统一清除登录相关 Cookie（本地域：localhost:3000） */
function clearCookies() {
  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );

  // 1) 会话 Token（HttpOnly）
  res.cookies.set({
    name: "sp_session",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: SECURE_COOKIE,
    maxAge: 0, // 立即过期
  });

  // 2) 会话存在的可读标记（非 HttpOnly，用于前端快速判断）
  res.cookies.set({
    name: "sp_has_session",
    value: "",
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: SECURE_COOKIE,
    maxAge: 0,
  });

  // 3) 展示用的用户信息（仅开发演示，非必需）
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

// 兜底：GET 也支持退出
export async function GET() {
  return clearCookies();
}
