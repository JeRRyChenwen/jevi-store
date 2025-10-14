// src/lib/auth.ts
export type SessionUser = {
  id: number;
  email: string;
  name: string | null;
};

const LS_USER_KEY = "sp:user";

/** —— 工具：是否在浏览器环境 —— */
const isBrowser = typeof window !== "undefined";

/** 读取本地缓存（登录后在 profile 页面会写入） */
export function loadRememberedUser(): SessionUser | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    if (typeof obj.id !== "number" || typeof obj.email !== "string") return null;
    return { id: obj.id, email: obj.email, name: obj.name ?? null };
  } catch {
    return null;
  }
}

/** 写入本地缓存 */
export function rememberUser(u: SessionUser | null) {
  if (!isBrowser) return;
  try {
    if (!u) {
      localStorage.removeItem(LS_USER_KEY);
      return;
    }
    localStorage.setItem(LS_USER_KEY, JSON.stringify(u));
  } catch {}
}

/** 通过 Cookie 粗略判断是否可能已登录（前端可读） */
export function isLoggedInViaCookie(): boolean {
  if (!isBrowser) return false;
  const c = document.cookie || "";
  // presence cookie 或真正的 session cookie 任一存在即可
  return /(?:^|;\s*)sp_has_session=1/.test(c) || /(?:^|;\s*)sp_session=/.test(c);
}

/** 向后端查询当前会话（需要 /auth/me；优先返回本地缓存） */
export async function getSessionUser(force = false): Promise<SessionUser | null> {
  if (!force) {
    const cached = loadRememberedUser();
    if (cached) return cached;
  }
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({} as any));

    // 兼容两种返回结构：
    // 1) { ok: true, user: { id, email, name } }
    // 2) { ok: true, id, email, name }
    const u =
      (data?.user && typeof data.user === "object" ? data.user : data) ?? null;

    if (u && typeof u.id === "number" && typeof u.email === "string") {
      const usr: SessionUser = {
        id: u.id,
        email: u.email,
        name: u.name ?? null,
      };
      rememberUser(usr);
      return usr;
    }
    return null;
  } catch {
    return null;
  }
}

/** 便捷函数：只要邮箱（checkout 用） */
export async function fetchAuthedEmail(): Promise<string | null> {
  // 先看本地缓存
  const cached = loadRememberedUser();
  if (cached?.email) return cached.email;

  // 再查后端
  const user = await getSessionUser(true);
  return user?.email ?? null;
}

/** 退出登录（清 Cookie + 清本地缓存） */
export async function logoutAndClear() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {}
  rememberUser(null);
}
