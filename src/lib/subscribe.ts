// src/lib/subscribe.ts
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  "https://purple-pond-3b88.lancechen1998.workers.dev"; // ← 也可用 .env.local 覆盖

export type SubscribePayload = {
  email: string;
  marketing_opt_in: boolean;
  source?: "checkout" | "signup" | "profile" | "admin" | string;
  user_id?: number | null;
  meta?: Record<string, any>;
};

export async function fetchMe() {
  try {
    const r = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include", // 允许跨域带 cookie
    });
    if (!r.ok) return null;
    return (await r.json()) as { id: string; email: string; name: string | null };
  } catch {
    return null;
  }
}

export async function subscribeEmail(input: SubscribePayload, opts?: { keepalive?: boolean }) {
  const payload = {
    email: input.email?.trim().toLowerCase(),
    marketing_opt_in: !!input.marketing_opt_in,
    source: input.source ?? "checkout",
    user_id: input.user_id ?? null,
    meta: input.meta ?? {},
  };

  // email 最基本校验
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("invalid email");
  }

  const r = await fetch(`${API_BASE}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // keepalive: 页面跳转时也尽量发完（浏览器支持）
    keepalive: opts?.keepalive === true,
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || `subscribe failed (${r.status})`);
  }
  return r.json();
}
