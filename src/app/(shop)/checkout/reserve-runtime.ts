// src/app/(shop)/checkout/reserve-runtime.ts

import { clearReserveCache } from "./reserve-cache";
import type { ReserveCache } from "./types";

export function scheduleReservePrefetch(args: {
  reserveTimerRef: { current: any };
  debounceMs: number;
  runPrefetch: () => unknown | Promise<unknown>;
}) {
  try {
    if (args.reserveTimerRef.current) {
      clearTimeout(args.reserveTimerRef.current);
    }
  } catch {}

  args.reserveTimerRef.current = setTimeout(() => {
    void args.runPrefetch();
  }, args.debounceMs);
}

export function resetReserveRuntimeState(args: {
  setReservationId: (value: string | null) => void;
  setReservationExpiresAtSec: (value: number | null) => void;
  setReservationCartHash: (value: string | null) => void;
  setReserveErr: (value: string | null) => void;
  setReserveLoading: (value: boolean) => void;
  reservePromiseRef: { current: Promise<ReserveCache | null> | null };
}) {
  args.setReservationId(null);
  args.setReservationExpiresAtSec(null);
  args.setReservationCartHash(null);
  args.setReserveErr(null);
  args.setReserveLoading(false);
  args.reservePromiseRef.current = null;
}

export function resetReserveForEmptyCart(args: {
  lastCartHashRef: { current: string };
  setReservationId: (value: string | null) => void;
  setReservationExpiresAtSec: (value: number | null) => void;
  setReservationCartHash: (value: string | null) => void;
  setReserveErr: (value: string | null) => void;
  setReserveLoading: (value: boolean) => void;
  reservePromiseRef: { current: Promise<ReserveCache | null> | null };
}) {
  args.lastCartHashRef.current = "";
  resetReserveRuntimeState({
    setReservationId: args.setReservationId,
    setReservationExpiresAtSec: args.setReservationExpiresAtSec,
    setReservationCartHash: args.setReservationCartHash,
    setReserveErr: args.setReserveErr,
    setReserveLoading: args.setReserveLoading,
    reservePromiseRef: args.reservePromiseRef,
  });
  clearReserveCache();
}

export function resetReserveForCartHashChange(args: {
  lastCartHashRef: { current: string };
  nextHash: string;
  setReservationId: (value: string | null) => void;
  setReservationExpiresAtSec: (value: number | null) => void;
  setReservationCartHash: (value: string | null) => void;
  setReserveErr: (value: string | null) => void;
  setReserveLoading: (value: boolean) => void;
  reservePromiseRef: { current: Promise<ReserveCache | null> | null };
}) {
  args.lastCartHashRef.current = args.nextHash;

  resetReserveRuntimeState({
    setReservationId: args.setReservationId,
    setReservationExpiresAtSec: args.setReservationExpiresAtSec,
    setReservationCartHash: args.setReservationCartHash,
    setReserveErr: args.setReserveErr,
    setReserveLoading: args.setReserveLoading,
    reservePromiseRef: args.reservePromiseRef,
  });

  clearReserveCache();
}