// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

type Body = { email?: string; password?: string };

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json().catch(() => ({}))) as Body;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  // 这里是示例：随便验证一下；你可以替换成真实后端校验
  if (password.length < 3) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = {
    id: "u_" + Buffer.from(email).toString("hex").slice(0, 8),
    email,
    name: email.split("@")[0],
  };

  const res = NextResponse.json(user, { status: 200 });
  const secure = process.env.NODE_ENV === "production";

  // 会话存在信号（供前端 hasSessionCookie() 检测）
  res.cookies.set({
    name: "sp_has_session",
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });

  // 存一点用户信息，/api/auth/me 会读它（演示用，真实项目建议只存会话 id）
  res.cookies.set({
    name: "sp_user",
    value: Buffer.from(JSON.stringify(user)).toString("base64"),
    httpOnly: false, // 仅演示；生产建议不要让前端读到
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
