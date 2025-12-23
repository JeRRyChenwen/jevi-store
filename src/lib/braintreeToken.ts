// src/lib/braintreeToken.ts
export const BT_TOKEN_KEY = "bt:token:v1";

// 默认缓存 5 分钟（你可以改短一点，比如 2 分钟）
const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CachedTokenV2 = {
  v: 2;
  token: string;
  exp: number; // epoch ms
};

function now() {
  return Date.now();
}

function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
}

function safeRemoveItem(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}

/**
 * 读取缓存：
 * - 优先读取 v2 JSON（带 exp）
 * - 兼容旧版纯字符串 token（无 TTL）=> 直接返回 token
 */
export function readCachedBraintreeToken(): string | null {
  const raw = safeGetItem(BT_TOKEN_KEY);
  if (!raw) return null;

  // v2: JSON
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Partial<CachedTokenV2>;
      const token = typeof parsed?.token === "string" ? parsed.token : null;
      const exp = typeof parsed?.exp === "number" ? parsed.exp : 0;

      // token 为空 => 视为无缓存
      if (!token) return null;

      // 过期 => 清掉并返回 null（让上层触发重新拉新）
      if (!exp || now() >= exp) {
        clearBraintreeToken();
        return null;
      }

      return token;
    } catch {
      // JSON 坏了：清掉避免死循环
      clearBraintreeToken();
      return null;
    }
  }

  // v1: 旧版纯字符串（无 TTL）
  // 为了兼容：先返回，但后续 prefetch 会覆盖为 v2
  return raw;
}

/**
 * 写入缓存（v2 JSON）
 */
export function writeCachedBraintreeToken(token: string, ttlMs: number = DEFAULT_TTL_MS) {
  const payload: CachedTokenV2 = {
    v: 2,
    token,
    exp: now() + Math.max(10_000, ttlMs), // 最少 10 秒，避免极端值
  };
  safeSetItem(BT_TOKEN_KEY, JSON.stringify(payload));
}

/**
 * 清理缓存
 */
export function clearBraintreeToken() {
  safeRemoveItem(BT_TOKEN_KEY);
}

/**
 * 仅在没有缓存（或缓存过期）时才真正发请求
 * - 若读到旧版纯字符串 token：也直接用一次（兼容）
 * - 但如果你希望强制升级为 v2，可以把下面“old token 直接返回”改成先覆盖一次
 */
export async function prefetchBraintreeToken(): Promise<string> {
  const cached = readCachedBraintreeToken();
  if (cached) return cached;

  const res = await fetch("/api/braintree/token", { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Get clientToken failed (${res.status}). ${txt}`);
  }

  const { clientToken, token } = await res.json();
  const auth = clientToken || token;
  if (!auth) throw new Error("No clientToken returned");

  // 写 v2 带 TTL
  writeCachedBraintreeToken(auth);

  return auth;
}

/**
 * 强制拉新并覆盖缓存（给“过期重试”时用）
 */
export async function fetchAndOverwriteBraintreeToken(): Promise<string> {
  clearBraintreeToken();
  return prefetchBraintreeToken();
}
