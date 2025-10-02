// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";

// 上游（你的 d1-worker）
const UP = (process.env.AUTH_UPSTREAM || "http://127.0.0.1:8787").replace(/\/+$/, "");
const PATH = process.env.AUTH_LOGIN_PATH || "/auth/login";
const UPSTREAM_URL = `${UP}${PATH}`;

export async function POST(req: NextRequest) {
  const secure = process.env.NODE_ENV === "production";

  // 读取原始 body，便于转发，同时尽量解析出 email/identifier 用来生成 sp_user
  const contentType = req.headers.get("content-type") || "application/json";
  const raw = await req.text();
  let emailLike = "";

  try {
    if (contentType.includes("application/json")) {
      const j = JSON.parse(raw || "{}");
      emailLike = (j?.email || j?.identifier || "").toString();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const sp = new URLSearchParams(raw);
      emailLike = (sp.get("email") || sp.get("identifier") || "") as string;
    } else {
      // multipart 等：用不到也没关系
    }
  } catch {}

  // 转发到 worker
  const up = await fetch(UPSTREAM_URL, {
    method: "POST",
    headers: { "content-type": contentType },
    body: raw,
  });

  // 读取上游响应
  const upJson = await up.json().catch(() => ({} as any));
  if (!up.ok) {
    return NextResponse.json(
      { error: upJson?.error || "upstream error", upstream: { status: up.status, body: upJson } },
      { status: up.status }
    );
  }

  // 这里我们在 Next 侧种两个“前端可读”的 cookie（Navbar 能看到）
  const res = NextResponse.json(
    { ok: true, upstream: { used: UPSTREAM_URL } },
    { status: 200 }
  );

  // 1) presence：前端用于快速感知有会话
  res.cookies.set({
    name: "sp_has_session",
    value: "1",
    httpOnly: false,            // ⭐ 前端需要读
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 7,
  });

  // 2) 用户快照：给 /api/auth/me 返回用户（演示用）
  //   若上游已经返回 user 就用上游，否则用表单里的 email 兜底
  const user =
    upJson?.user && typeof upJson.user === "object"
      ? upJson.user
      : {
          id: emailLike ? "u_" + Buffer.from(emailLike).toString("hex").slice(0, 8) : "",
          email: emailLike || "",
          name: (emailLike || "").split("@")[0] || "user",
        };

  res.cookies.set({
    name: "sp_user",
    value: Buffer.from(JSON.stringify(user)).toString("base64"),
    httpOnly: false,            // ⭐ 前端需要读
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
