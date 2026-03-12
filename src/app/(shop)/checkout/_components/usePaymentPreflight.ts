// src/app/(shop)/checkout/_components/usePaymentPreflight.ts
"use client";

import { useCallback } from "react";
import type { StockCheckItem } from "./PaymentStep.helpers";

type Params = {
  stockItems: StockCheckItem[];
  cartHash: string;

  preReservationId?: string | null;
  preReservationCartHash?: string | null;
  preReservationExpiresAtSec?: number | null;

  reservationId: string | null;
  reservationExpiresAt: number | null;

  setReservationId: React.Dispatch<React.SetStateAction<string | null>>;
  setReservationExpiresAt: React.Dispatch<React.SetStateAction<number | null>>;
  reservationIdRef: React.MutableRefObject<string | null>;
};

export function usePaymentPreflight({
  stockItems,
  cartHash,

  preReservationId,
  preReservationCartHash,
  preReservationExpiresAtSec,

  reservationId,
  reservationExpiresAt,

  setReservationId,
  setReservationExpiresAt,
  reservationIdRef,
}: Params) {
  const runStockReservePreflight = useCallback(async (): Promise<string> => {
    // 1) 必须有 items（否则 PayPal 点击没意义）
    if (!stockItems.length) {
      throw {
        status: 400,
        code: "no_items",
        error: "no_items",
        message: "No items to pay for.",
        detail: { items: [] },
      };
    }

    // 2) 必须有 preReservationId（PaymentStep 不负责 reserve）
    const rid = String(preReservationId || "").trim();
    if (!rid) {
      throw {
        status: 404,
        code: "reservation_not_found",
        error: "reservation_not_found",
        message: "No stock reservation found. Please go back to Address and reserve again.",
        detail: { preReservationId: preReservationId ?? null },
      };
    }

    // 3) 必须 cart_hash 一致（防止 bag 改了）
    const preHash = String(preReservationCartHash || "").trim();
    if (preHash && preHash !== cartHash) {
      throw {
        status: 409,
        code: "reservation_mismatch",
        error: "reservation_mismatch",
        message: "Your bag changed. Please go back to the Address step and reserve again.",
        detail: { preHash, cartHash, reservation_id: rid },
      };
    }

    // 4) 必须没过期（Address step 传入 expiresAtSec）
    const expSec = Number(preReservationExpiresAtSec || 0);
    const expMs = Number.isFinite(expSec) && expSec > 0 ? expSec * 1000 : 0;

    if (!expMs) {
      throw {
        status: 409,
        code: "reservation_invalid",
        error: "reservation_invalid",
        message: "Invalid reservation expiry. Please go back to Address and reserve again.",
        detail: {
          preReservationExpiresAtSec: preReservationExpiresAtSec ?? null,
          reservation_id: rid,
        },
      };
    }

    if (Date.now() >= expMs - 1000) {
      throw {
        status: 409,
        code: "reservation_expired",
        error: "reservation_expired",
        message: "Your stock reservation has expired. Please go back to Address and reserve again.",
        detail: { reservation_id: rid, expires_at_ms: expMs },
      };
    }

    // 同步到本地 state/ref，供 UI 倒计时 & successMeta 使用
    if (reservationId !== rid) setReservationId(rid);
    if (reservationExpiresAt !== expMs) setReservationExpiresAt(expMs);
    reservationIdRef.current = rid;

    return rid;
  }, [
    stockItems,
    cartHash,
    preReservationId,
    preReservationCartHash,
    preReservationExpiresAtSec,
    reservationId,
    reservationExpiresAt,
    setReservationId,
    setReservationExpiresAt,
    reservationIdRef,
  ]);

  return {
    runStockReservePreflight,
  };
}