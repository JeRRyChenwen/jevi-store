// src/app/profile/_actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * 退出登录：
 * - 调用后端 /api/auth/logout（经 rewrites 代理到 Worker /auth/logout）
 * - 本地删除 sp_* cookie（双保险）
 * - 服务端重定向到首页
 */
export async function logoutAction() {
  const jar = await cookies();                 // 👈 这里要 await
  const cookieHeader = jar.toString();

  // 1) 通知后端清除会话
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { accept: "application/json", cookie: cookieHeader },
      cache: "no-store",
    });
  } catch {
    // 忽略网络错误，本地兜底删除
  }

  // 2) 本地兜底删除
  ["sp_session", "sp_has_session", "sp_user"].forEach((k) => {
    try {
      jar.delete(k);
    } catch {}
  });

  // 3) 跳首页
  redirect("/");
}
