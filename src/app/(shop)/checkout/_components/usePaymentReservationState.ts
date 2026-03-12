// src/app/(shop)/checkout/_components/usePaymentReservationState.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import type { PayError } from "./PaymentStep.helpers";

type Params = {
  visible: boolean;
  isPayProcessing: boolean;
  suppressBlockedHint: boolean;
  payError: PayError | null;

  derivedItemsCount: number;
  hasAddress: boolean;
  effectiveOrderEmail: string;
  isLoggedIn: boolean;

  preReserveLoading?: boolean;
  preReserveError?: string | null;

  preReservationId?: string | null;
  preReservationCartHash?: string | null;
  preReservationExpiresAtSec?: number | null;

  cartHash: string;
  derivedTotalMinor: number;
};

type Result = {
  reservationSecondsLeft: number | null;
  reservationExpired: boolean;
  payBlockedReason: string | null;
};

export function usePaymentReservationState({
  visible,
  isPayProcessing,
  suppressBlockedHint,
  payError,

  derivedItemsCount,
  hasAddress,
  effectiveOrderEmail,
  isLoggedIn,

  preReserveLoading = false,
  preReserveError,

  preReservationId,
  preReservationCartHash,
  preReservationExpiresAtSec,

  cartHash,
  derivedTotalMinor,
}: Params): Result {
  const [reservationSecondsLeft, setReservationSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setReservationSecondsLeft(null);
      return;
    }

    const rid = String(preReservationId || "").trim();
    const expSec = Number(preReservationExpiresAtSec || 0);
    const expMs = Number.isFinite(expSec) && expSec > 0 ? expSec * 1000 : 0;

    if (!rid || !expMs) {
      setReservationSecondsLeft(null);
      return;
    }

    let timer: number | null = null;

    const tick = () => {
      const msLeft = expMs - Date.now();
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setReservationSecondsLeft(secLeft);
    };

    tick();
    timer = window.setInterval(tick, 1000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [visible, preReservationId, preReservationExpiresAtSec]);

  const reservationExpired = useMemo(() => {
    return typeof reservationSecondsLeft === "number" && reservationSecondsLeft <= 0;
  }, [reservationSecondsLeft]);

  const payBlockedReason = useMemo(() => {
    if (!visible) return null;
    if (isPayProcessing) return null;
    if (suppressBlockedHint) return null;
    if (payError) return null;

    if (derivedItemsCount <= 0) {
      return "Your bag is empty. Please add at least one item before paying.";
    }

    if (!hasAddress) {
      return "No delivery address found. Please complete the Address step before paying.";
    }

    if (!String(effectiveOrderEmail || "").trim()) {
      return isLoggedIn
        ? "No account email found. Please check your account settings before paying."
        : "Email required for order. Please go back to the Address step and enter your email.";
    }

    if (preReserveLoading) {
      return "Reserving stock… Please wait a moment.";
    }

    if (preReserveError && String(preReserveError).trim()) {
      return String(preReserveError).trim();
    }

    const rid = String(preReservationId || "").trim();
    const preHash = String(preReservationCartHash || "").trim();
    const expSec = Number(preReservationExpiresAtSec || 0);
    const expMs = Number.isFinite(expSec) && expSec > 0 ? expSec * 1000 : 0;

    if (!rid) {
      return "No stock reservation found. Please go back to the Address step and reserve again.";
    }

    if (preHash && preHash !== cartHash) {
      return "Your bag changed. Please go back to the Address step and reserve again.";
    }

    if (!expMs) {
      return "Invalid reservation. Please go back to the Address step and reserve again.";
    }

    if (reservationExpired || Date.now() >= expMs - 1000) {
      return "Your stock reservation has expired. Please go back to the Address step and reserve again.";
    }

    if (derivedTotalMinor <= 0) {
      return "Invalid total amount. Please review your order.";
    }

    return null;
  }, [
    visible,
    isPayProcessing,
    suppressBlockedHint,
    payError,
    derivedItemsCount,
    hasAddress,
    effectiveOrderEmail,
    isLoggedIn,
    preReserveLoading,
    preReserveError,
    preReservationId,
    preReservationCartHash,
    preReservationExpiresAtSec,
    cartHash,
    derivedTotalMinor,
    reservationExpired,
  ]);

  return {
    reservationSecondsLeft,
    reservationExpired,
    payBlockedReason,
  };
}