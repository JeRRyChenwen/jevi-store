// src/lib/braintreeToken.ts
export const BT_TOKEN_KEY = "bt:token:v1";

export function readCachedBraintreeToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage.getItem(BT_TOKEN_KEY); } catch { return null; }
}

export function writeCachedBraintreeToken(token: string) {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(BT_TOKEN_KEY, token); } catch {}
}

export function clearBraintreeToken() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(BT_TOKEN_KEY); } catch {}
}

// 仅在没有缓存时才真正发请求
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
  writeCachedBraintreeToken(auth);
  return auth;
}

// 强制拉新并覆盖缓存（给“过期重试”时用）
export async function fetchAndOverwriteBraintreeToken(): Promise<string> {
  clearBraintreeToken();
  return prefetchBraintreeToken();
}
