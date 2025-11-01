// src/lib/http.ts
/** 统一走相对路径 `/api/...`，这样浏览器能接到 Set-Cookie。 */
const API_PREFIX = "/api";

type FetchOpts = RequestInit & { json?: any; query?: Record<string, string | number | boolean | null | undefined> };

function withQuery(path: string, query?: FetchOpts["query"]) {
  if (!query) return path;
  const u = new URL(path, "http://dummy"); // 仅用于拼 query
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    u.searchParams.set(k, String(v));
  });
  return u.pathname + (u.search ? u.search : "");
}

export async function apiGet<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = API_PREFIX + withQuery(path, opts.query);
  const r = await fetch(url, {
    ...opts,
    credentials: "include", // 关键：带上 Cookie
    headers: { "accept": "application/json", ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}

export async function apiPost<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = API_PREFIX + withQuery(path, opts.query);
  const isJson = opts.json !== undefined;
  const r = await fetch(url, {
    method: "POST",
    ...opts,
    credentials: "include", // 关键：带上 Cookie
    headers: {
      ...(isJson ? { "content-type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
    body: isJson ? JSON.stringify(opts.json) : opts.body,
  });
  // 方便定位 401/404
  if (!r.ok) {
    let detail: any = undefined;
    try { detail = await r.json(); } catch {}
    throw new Error(`POST ${url} -> ${r.status} ${r.statusText}${detail ? " :: " + JSON.stringify(detail) : ""}`);
  }
  return (await r.json()) as T;
}

/** 仅供“纯读、不需要 Cookie”的地方使用（如公开商品列表） */
export const publicBase = process.env.NEXT_PUBLIC_API_BASE?.trim() || "";
export async function publicGet<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  if (!publicBase) throw new Error("NEXT_PUBLIC_API_BASE not set");
  const url = publicBase.replace(/\/+$/, "") + withQuery(path, opts.query);
  const r = await fetch(url, { ...opts, headers: { "accept": "application/json", ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return (await r.json()) as T;
}
