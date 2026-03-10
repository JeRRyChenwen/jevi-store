// src/lib/auth.ts

/** 会话中的用户信息（前端用的轻量结构） */
export type SessionUser = {
  id: string | number;
  email: string | null;
  name: string | null;
};

const LS_USER_KEY = "sp:user";

/** —— 工具：是否在浏览器环境 —— */
const isBrowser = typeof window !== "undefined";

/** 读取本地缓存（登录成功/拉取 me 成功后会写入） */
export function loadRememberedUser(): SessionUser | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;

    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    // ✅ 兼容 id 既可能是 number，也可能是 string
    const idOk =
      typeof obj.id === "number" ||
      (typeof obj.id === "string" && obj.id.trim().length > 0);

    const emailOk = obj.email === null || typeof obj.email === "string";

    if (!idOk || !emailOk) return null;

    return {
      id: obj.id,
      email: obj.email,
      name: obj.name ?? null,
    };
  } catch {
    return null;
  }
}

/** 写入/清除本地缓存 */
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

/**
 * ⚠️ 旧兼容函数：仅用于“粗略判断是否可能已登录”
 * 不能作为业务权威来源。
 *
 * 权威登录态请统一使用 getSessionUser() / /api/auth/me
 */
export function isLoggedInViaCookie(): boolean {
  if (!isBrowser) return false;
  const c = document.cookie || "";
  return /(?:^|;\s*)sp_has_session=1/.test(c) || /(?:^|;\s*)sp_session=/.test(c);
}

/** 统一 GET 到相对路径 `/api/...`（带上 Cookie） */
async function apiGet<T = any>(path: string, query?: Record<string, string | number | boolean | null | undefined>) {
  const u = new URL(path, "http://localhost"); // 仅用于构造 query
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      u.searchParams.set(k, String(v));
    }
  }
  const r = await fetch(u.pathname + (u.search || ""), {
    method: "GET",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  if (!r.ok) {
    let detail: any = null;
    try { detail = await r.json(); } catch {}
    throw new Error(`GET ${u.pathname}${u.search} -> ${r.status} ${r.statusText}${detail ? " :: " + JSON.stringify(detail) : ""}`);
  }
  return (await r.json()) as T;
}

/** 统一 POST 到相对路径 `/api/...`（带上 Cookie） */
async function apiPost<T = any>(
  path: string,
  body: any,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const u = new URL(path, "http://localhost");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      u.searchParams.set(k, String(v));
    }
  }
  const r = await fetch(u.pathname + (u.search || ""), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) {
    let detail: any = null;
    try { detail = await r.json(); } catch {}
    throw new Error(`POST ${u.pathname}${u.search} -> ${r.status} ${r.statusText}${detail ? " :: " + JSON.stringify(detail) : ""}`);
  }
  return (await r.json()) as T;
}

/** 向后端查询当前会话（需要 /auth/me；优先返回本地缓存，force=true 可强制打接口） */
export async function getSessionUser(force = false): Promise<SessionUser | null> {
  if (!force) {
    const cached = loadRememberedUser();
    if (cached) return cached;
  }

  try {
    // ✅ 调试阶段保留 debug=1，后续稳定后可移除
    const data: any = await apiGet("/api/auth/me", { debug: 1 });

    // 兼容两种返回结构：
    // 1) { ok: true, user: { id, email, name } }
    // 2) { ok: true, id, email, name }
    const u = (data?.user && typeof data.user === "object" ? data.user : data) ?? null;

    const rawId = u?.id;
    const idOk =
      typeof rawId === "number" ||
      (typeof rawId === "string" && rawId.trim().length > 0);

    if (!u || !idOk) {
      rememberUser(null);
      return null;
    }

    const usr: SessionUser = {
      id: rawId,
      email: typeof u.email === "string" ? u.email : (u.email ?? null),
      name: typeof u.name === "string" ? u.name : (u.name ?? null),
    };

    rememberUser(usr);
    return usr;
  } catch {
    rememberUser(null);
    return null;
  }
}

/**
 * ⚠️ 旧兼容函数：仅保留给尚未迁移的旧代码使用
 * 新代码应直接使用 getSessionUser()，不要只单独取 email。
 */
export async function fetchAuthedEmail(): Promise<string | null> {
  const cached = loadRememberedUser();
  if (cached?.email) return cached.email;

  const user = await getSessionUser(true);
  return user?.email ?? null;
}

/** 登录：必须走相对路径 + credentials: 'include'，才能接到 Set-Cookie */
export async function login(email: string, password: string, debug = false) {
  const payload: any = { email, password };
  if (debug) payload.__force = true; // 你 Worker 里支持这个调试旁路
  const res = await apiPost<{ ok: true; worker_version: string; debug?: any }>(
    "/api/auth/login",
    payload,
    debug ? { debug: 1 } : undefined
  );
  // 登录后立刻刷新会话缓存（如果服务端返回了用户信息可以直接用；否则调用 /auth/me）
  await getSessionUser(true).catch(() => {});
  return res;
}

/** 登出：清 Cookie + 清本地缓存 */
export async function logoutAndClear() {
  try {
    await apiPost("/api/auth/logout", {});
  } catch {}
  rememberUser(null);
}

/** 保存“默认地址”（需要已登录：/api/addresses） */
export type SaveAddressBody = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

export async function saveDefaultAddress(payload: SaveAddressBody) {
  // 这里同样走相对路径，浏览器带上 Cookie，服务端才能识别会话
  // 调试时可带 debug=1，服务器会在 401 时回显诊断信息（reason、cookie_present、jwt_echo）
  return apiPost<{ ok: true; address_id: number; worker_version: string }>(
    "/api/addresses",
    payload,
    { debug: 1 }
  );
}
