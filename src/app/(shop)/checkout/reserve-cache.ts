// src/app/(shop)/checkout/reserve-cache.ts

import { SS_RESERVE_KEY } from "./constants";
import type { ReserveCache } from "./types";

export function readReserveCache(): ReserveCache | null {
  try {
    const raw = sessionStorage.getItem(SS_RESERVE_KEY);
    if (!raw) return null;

    const obj = JSON.parse(raw) as any;
    const rid = String(obj?.reservation_id ?? "").trim();
    const exp = Number(obj?.expires_at_sec ?? 0);
    const ch = String(obj?.cart_hash ?? "").trim();

    if (!rid || !Number.isFinite(exp) || exp <= 0 || !ch) return null;

    return {
      reservation_id: rid,
      expires_at_sec: Math.floor(exp),
      cart_hash: ch,
      ts: Number(obj?.ts ?? Date.now()),
    };
  } catch {
    return null;
  }
}

export function writeReserveCache(next: ReserveCache) {
  try {
    sessionStorage.setItem(SS_RESERVE_KEY, JSON.stringify(next));
  } catch {}
}

export function clearReserveCache() {
  try {
    sessionStorage.removeItem(SS_RESERVE_KEY);
  } catch {}
}