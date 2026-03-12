// src/app/(shop)/checkout/_components/usePaymentReservationLifecycle.ts
"use client";

import { useEffect } from "react";
import type { PayError } from "./PaymentStep.helpers";

type Params = {
  visible: boolean;
  cartHash: string;

  preReservationId?: string | null;
  preReservationExpiresAtSec?: number | null;
  preReservationCartHash?: string | null;

  reservationId: string | null;
  reservationExpiresAt: number | null;
  reservationExpired: boolean;

  setReservationId: React.Dispatch<React.SetStateAction<string | null>>;
  setReservationExpiresAt: React.Dispatch<React.SetStateAction<number | null>>;
  reservationIdRef: React.MutableRefObject<string | null>;
  setPayError: React.Dispatch<React.SetStateAction<PayError | null>>;
};

export function usePaymentReservationLifecycle({
  visible,
  cartHash,

  preReservationId,
  preReservationExpiresAtSec,
  preReservationCartHash,

  reservationId,
  reservationExpiresAt,
  reservationExpired,

  setReservationId,
  setReservationExpiresAt,
  reservationIdRef,
  setPayError,
}: Params) {
  // 同步 page.tsx 预加载的 reservation -> PaymentStep 内部状态
  useEffect(() => {
    const rid = String(preReservationId || "").trim();
    const expSec = Number(preReservationExpiresAtSec || 0);
    const preHash = String(preReservationCartHash || "").trim();

    if (!rid || !Number.isFinite(expSec) || expSec <= 0) return;

    // 必须 cart_hash 一致才复用（避免用户改了 bag）
    if (preHash && preHash !== cartHash) return;

    const expMs = expSec * 1000;
    if (Date.now() >= expMs - 1000) return;

    // 只在本地还没有有效 reservation 时写入（避免覆盖更“新”的）
    const localValid =
      reservationId &&
      reservationExpiresAt &&
      Date.now() < reservationExpiresAt - 1000;

    if (localValid) return;

    setReservationId(rid);
    setReservationExpiresAt(expMs);
    reservationIdRef.current = rid;
    setPayError(null);
  }, [
    preReservationId,
    preReservationExpiresAtSec,
    preReservationCartHash,
    cartHash,
    reservationId,
    reservationExpiresAt,
    setReservationId,
    setReservationExpiresAt,
    reservationIdRef,
    setPayError,
  ]);

  // countdown 已抽到 usePaymentReservationState
  // 这里只负责：确认过期后，清理本地 reservation 状态，并写入统一 payError
  useEffect(() => {
    if (!visible) return;
    if (!reservationExpired) return;

    const rid = String(preReservationId || "").trim();

    setReservationId(null);
    setReservationExpiresAt(null);
    reservationIdRef.current = null;

    setPayError((prev) => {
      if (prev?.type === "reservation_expired") return prev;

      return {
        type: "reservation_expired",
        status: 409,
        message:
          "Your stock reservation has expired. Please go back to Address and reserve again.",
        detail: { reservation_id: rid || null },
      };
    });
  }, [
    visible,
    reservationExpired,
    preReservationId,
    setReservationId,
    setReservationExpiresAt,
    reservationIdRef,
    setPayError,
  ]);
}