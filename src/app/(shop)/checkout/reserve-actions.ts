// src/app/(shop)/checkout/reserve-actions.ts

import { clearReserveCache, readReserveCache } from "./reserve-cache";
import { pickReservationIdForRelease } from "./reserve-release";
import type { ReserveCache } from "./types";

export function clearReserveLocalState(args: {
  setReservationId: (value: string | null) => void;
  setReservationExpiresAtSec: (value: number | null) => void;
  setReservationCartHash: (value: string | null) => void;
  setReserveErr: (value: string | null) => void;
  setReserveLoading: (value: boolean) => void;
  reservePromiseRef: { current: Promise<ReserveCache | null> | null };
  lastReserveKeyRef: { current: string };
}) {
  clearReserveCache();
  args.setReservationId(null);
  args.setReservationExpiresAtSec(null);
  args.setReservationCartHash(null);
  args.setReserveErr(null);
  args.setReserveLoading(false);
  args.reservePromiseRef.current = null;

  // 也顺手清一下去重 key（避免后续误判）
  args.lastReserveKeyRef.current = "";
}

export async function releaseReservationNow(args: {
  reason: string;
  reservationId: string | null | undefined;
  apiURL: (path: string) => string;
  abortInFlightReserve: () => void;
  clearReserveLocalState: () => void;
}) {
  try {
    const cached = readReserveCache();
    const rid = pickReservationIdForRelease(
      args.reservationId,
      cached?.reservation_id ?? null
    );
    if (!rid) return;

    console.log("[reserve] releaseReservationNow", { reason: args.reason, rid });

    // 先 abort 掉可能正在进行的 reserve 请求，避免竞态
    try {
      args.abortInFlightReserve();
    } catch {}

    const payload = { reservation_id: rid, reason: args.reason };
    const body = JSON.stringify(payload);

    // ✅ 最可靠：sendBeacon（路由跳转/关闭页面时最稳）
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok =
        typeof navigator !== "undefined" &&
        navigator.sendBeacon?.(args.apiURL("/stock/release"), blob);

      if (ok) {
        args.clearReserveLocalState();
        return;
      }
    } catch {}

    // ✅ fallback：fetch keepalive（有些浏览器 sendBeacon 不可用）
    try {
      fetch(args.apiURL("/stock/release"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        keepalive: true,
        body,
      }).catch(() => {});
    } catch {}

    // 无论请求是否成功，都先把本地清掉（用户体验：立即恢复显示）
    args.clearReserveLocalState();
  } catch (e) {
    console.warn("[reserve] releaseReservationNow failed", e);
  }
}