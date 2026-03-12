// src/app/(shop)/checkout/checkout-reserve-ops.ts
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ReserveCache } from "./types";
import { RESERVE_DEBOUNCE_MS } from "./constants";
import {
  clearReserveLocalState as clearReserveLocalStateHelper,
  releaseReservationNow as releaseReservationNowHelper,
} from "./reserve-actions";
import {
  doPrefetchReserveHelper,
  ensureReserveBeforeNextHelper,
} from "./reserve-prefetch";
import { scheduleReservePrefetch } from "./reserve-runtime";

type SetString = Dispatch<SetStateAction<string | null>>;
type SetNumber = Dispatch<SetStateAction<number | null>>;
type SetBoolean = Dispatch<SetStateAction<boolean>>;
type ReservePromiseRef = MutableRefObject<Promise<ReserveCache | null> | null>;

export function clearCheckoutReserveLocalState({
  setReservationId,
  setReservationExpiresAtSec,
  setReservationCartHash,
  setReserveErr,
  setReserveLoading,
  reservePromiseRef,
  lastReserveKeyRef,
}: {
  setReservationId: SetString;
  setReservationExpiresAtSec: SetNumber;
  setReservationCartHash: SetString;
  setReserveErr: SetString;
  setReserveLoading: SetBoolean;
  reservePromiseRef: ReservePromiseRef;
  lastReserveKeyRef: MutableRefObject<string>;
}) {
  clearReserveLocalStateHelper({
    setReservationId,
    setReservationExpiresAtSec,
    setReservationCartHash,
    setReserveErr,
    setReserveLoading,
    reservePromiseRef,
    lastReserveKeyRef,
  });
}

export async function releaseCheckoutReservationNow({
  reason,
  reservationId,
  apiURL,
  reserveAbortRef,
  clearReserveLocalState,
}: {
  reason: string;
  reservationId: string | null;
  apiURL: (path: string) => string;
  reserveAbortRef: MutableRefObject<AbortController | null>;
  clearReserveLocalState: () => void;
}) {
  await releaseReservationNowHelper({
    reason,
    reservationId,
    apiURL,
    abortInFlightReserve: () => {
      try {
        reserveAbortRef.current?.abort();
      } catch {}
    },
    clearReserveLocalState,
  });
}

export async function prefetchCheckoutReserve({
  reason,
  force = false,
  hasItems,
  cart,
  reserveLoading,
  apiURL,
  reserveAbortRef,
  lastReserveKeyRef,
  setReserveLoading,
  setReserveErr,
  setReservationId,
  setReservationExpiresAtSec,
  setReservationCartHash,
}: {
  reason: string;
  force?: boolean;
  hasItems: boolean;
  cart: any[];
  reserveLoading: boolean;
  apiURL: (path: string) => string;
  reserveAbortRef: MutableRefObject<AbortController | null>;
  lastReserveKeyRef: MutableRefObject<string>;
  setReserveLoading: SetBoolean;
  setReserveErr: SetString;
  setReservationId: SetString;
  setReservationExpiresAtSec: SetNumber;
  setReservationCartHash: SetString;
}): Promise<ReserveCache | null> {
  return await doPrefetchReserveHelper({
    reason,
    force,
    hasItems,
    cart,
    reserveLoading,
    apiURL,
    reserveAbortRef,
    lastReserveKeyRef,
    setReserveLoading,
    setReserveErr,
    setReservationId,
    setReservationExpiresAtSec,
    setReservationCartHash,
  });
}

export async function ensureCheckoutReserveBeforeNext({
  hasItems,
  cart,
  reservationId,
  reservationExpiresAtSec,
  reservationCartHash,
  reservePromiseRef,
  setReserveErr,
  runPrefetch,
}: {
  hasItems: boolean;
  cart: any[];
  reservationId: string | null;
  reservationExpiresAtSec: number | null;
  reservationCartHash: string | null;
  reservePromiseRef: ReservePromiseRef;
  setReserveErr: SetString;
  runPrefetch: () => Promise<ReserveCache | null>;
}): Promise<ReserveCache> {
  return await ensureReserveBeforeNextHelper({
    hasItems,
    cart,
    reservationId,
    reservationExpiresAtSec,
    reservationCartHash,
    reservePromiseRef,
    setReserveErr,
    runPrefetch,
  });
}

export function scheduleCheckoutReservePrefetch({
  reserveTimerRef,
  reason,
  force = false,
  runPrefetch,
}: {
  reserveTimerRef: MutableRefObject<any>;
  reason: string;
  force?: boolean;
  runPrefetch: () => Promise<ReserveCache | null>;
}) {
  scheduleReservePrefetch({
    reserveTimerRef,
    debounceMs: RESERVE_DEBOUNCE_MS,
    runPrefetch: () => runPrefetch(),
  });
}