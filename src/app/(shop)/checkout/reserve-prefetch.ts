// src/app/(shop)/checkout/reserve-prefetch.ts

import { clearReserveCache, readReserveCache, writeReserveCache } from "./reserve-cache";
import { buildCartHash, cartToReserveItems } from "./reserve-helpers";
import type { ReserveAPIResp, ReserveCache } from "./types";

function getOrCreateReserveRequestId(cartHash: string): string {
  const reqIdKey = "sp.checkout.reserve.reqid.v1";
  let request_id = "";

  try {
    request_id = sessionStorage.getItem(reqIdKey) || "";
    if (!request_id) {
      request_id = `rid_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      sessionStorage.setItem(reqIdKey, request_id);
    }
  } catch {}

  return `${request_id}:${cartHash}`;
}

export async function doPrefetchReserveHelper(args: {
  reason: string;
  force?: boolean;

  hasItems: boolean;
  cart: any[];
  reserveLoading: boolean;

  apiURL: (path: string) => string;

  reserveAbortRef: { current: AbortController | null };
  lastReserveKeyRef: { current: string };

  setReserveLoading: (value: boolean) => void;
  setReserveErr: (value: string | null) => void;
  setReservationId: (value: string | null) => void;
  setReservationExpiresAtSec: (value: number | null) => void;
  setReservationCartHash: (value: string | null) => void;
}): Promise<ReserveCache | null> {
  const force = !!args.force;

  if (!args.hasItems) return null;

  const items = cartToReserveItems(args.cart);
  if (!items.length) return null;

  const cart_hash = buildCartHash(items);

  // key to dedupe requests
  const reserveKey = `${cart_hash}`;

  // ✅ 1) try reuse cache (sessionStorage)
  const nowSec = Math.floor(Date.now() / 1000);
  const cached = readReserveCache();
  if (!force && cached && cached.cart_hash === cart_hash) {
    const secLeft = cached.expires_at_sec - nowSec;

    // ✅ 修法2：只要还没过期（留 1 秒余量）就复用
    if (secLeft > 1) {
      args.setReservationId(cached.reservation_id);
      args.setReservationExpiresAtSec(cached.expires_at_sec);
      args.setReservationCartHash(cached.cart_hash);
      args.setReserveErr(null);
      args.setReserveLoading(false);
      return cached;
    }
  }

  // ✅ 2) avoid duplicating same reserve in flight by key+loading (soft guard)
  if (!force && args.lastReserveKeyRef.current === reserveKey && args.reserveLoading) {
    return null;
  }
  args.lastReserveKeyRef.current = reserveKey;

  // ✅ 3) abort previous
  try {
    args.reserveAbortRef.current?.abort();
  } catch {}
  const ac = new AbortController();
  args.reserveAbortRef.current = ac;

  // ✅ 4) call reserve API
  args.setReserveLoading(true);
  args.setReserveErr(null);

  const request_id = getOrCreateReserveRequestId(cart_hash);

  try {
    const res = await fetch(args.apiURL("/stock/reserve"), {
      method: "POST",
      credentials: "include",
      signal: ac.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items,
        request_id,
        cart_hash,
      }),
    });

    const data = (await res.json().catch(() => null)) as ReserveAPIResp | null;

    if (!res.ok || !data || data.ok !== true) {
      const err = String(data?.error || `reserve_http_${res.status}`);
      const msg = String(data?.message || err);

      args.setReserveErr(msg);
      args.setReserveLoading(false);

      clearReserveCache();
      args.setReservationId(null);
      args.setReservationExpiresAtSec(null);
      args.setReservationCartHash(null);
      return null;
    }

    const rid = String(data.reservation_id || "").trim();
    const expSec = Number(data.expires_at ?? 0);

    if (!rid || !Number.isFinite(expSec) || expSec <= 0) {
      args.setReserveErr("reserve_invalid_response");
      args.setReserveLoading(false);

      clearReserveCache();
      args.setReservationId(null);
      args.setReservationExpiresAtSec(null);
      args.setReservationCartHash(null);
      return null;
    }

    const nextCache: ReserveCache = {
      reservation_id: rid,
      expires_at_sec: Math.floor(expSec),
      cart_hash,
      ts: Date.now(),
    };

    writeReserveCache(nextCache);

    args.setReservationId(rid);
    args.setReservationExpiresAtSec(nextCache.expires_at_sec);
    args.setReservationCartHash(cart_hash);
    args.setReserveErr(null);
    args.setReserveLoading(false);

    return nextCache;
  } catch (e: any) {
    if (String(e?.name) === "AbortError") return null;

    args.setReserveErr(String(e?.message || e || "reserve_failed"));
    args.setReserveLoading(false);

    clearReserveCache();
    args.setReservationId(null);
    args.setReservationExpiresAtSec(null);
    args.setReservationCartHash(null);
    return null;
  }
}

export async function ensureReserveBeforeNextHelper(args: {
  hasItems: boolean;
  cart: any[];

  reservationId: string | null;
  reservationExpiresAtSec: number | null;
  reservationCartHash: string | null;

  reservePromiseRef: { current: Promise<ReserveCache | null> | null };
  setReserveErr: (value: string | null) => void;

  runPrefetch: () => Promise<ReserveCache | null>;
}): Promise<ReserveCache> {
  // 1) 基础校验：必须有商品
  if (!args.hasItems) {
    args.setReserveErr("Your bag is empty. Please add at least one item before continuing.");
    throw new Error("no_items");
  }

  const items = cartToReserveItems(args.cart);
  if (!items.length) {
    args.setReserveErr("Your bag is empty. Please add at least one item before continuing.");
    throw new Error("no_items");
  }

  // 2) 如果已经有有效 reservation 且 cart_hash 没变，直接复用（不发请求）
  const nowSec = Math.floor(Date.now() / 1000);
  const rid = String(args.reservationId || "").trim();
  const exp = Number(args.reservationExpiresAtSec || 0);
  const hash = String(args.reservationCartHash || "").trim();
  const currentHash = buildCartHash(items);

  if (rid && exp > 0) {
    const secLeft = exp - nowSec;
    const hashOk = !hash || hash === currentHash;
    if (secLeft > 1 && hashOk) {
      return {
        reservation_id: rid,
        expires_at_sec: exp,
        cart_hash: currentHash,
        ts: Date.now(),
      };
    }
  }

  // 3) mutex：如果有 in-flight reserve，等待同一个 promise
  if (args.reservePromiseRef.current) {
    const r = await args.reservePromiseRef.current;
    if (!r) throw new Error("reserve_failed");
    return r;
  }

  // 4) 创建本次 promise，并写入 ref
  args.reservePromiseRef.current = (async () => {
    const r = await args.runPrefetch();
    return r;
  })();

  try {
    const r = await args.reservePromiseRef.current;
    if (!r) {
      throw new Error("reserve_failed");
    }
    return r;
  } finally {
    args.reservePromiseRef.current = null;
  }
}