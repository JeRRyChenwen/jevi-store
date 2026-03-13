"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReserveCache, StepKey } from "../types";
import {
  resetReserveForCartHashChange,
  resetReserveForEmptyCart,
} from "../reserve-runtime";
import {
  clearCheckoutReserveLocalState,
  ensureCheckoutReserveBeforeNext,
  prefetchCheckoutReserve,
  releaseCheckoutReservationNow,
  scheduleCheckoutReservePrefetch,
} from "../checkout-reserve-ops";
import {
  attachReserveWindowLifecycle,
  cleanupReserveResources,
  createReserveWindowLifecycleHandlers,
  detachReserveWindowLifecycle,
  shouldReleaseOnRouteLeave,
} from "../reserve-lifecycle";

type UseCheckoutReservationParams = {
  hasItems: boolean;
  cart: any[];
  cartHash: string;
  step: StepKey;
  apiURL: (path: string) => string;
};

export function useCheckoutReservation({
  hasItems,
  cart,
  cartHash,
  step,
  apiURL,
}: UseCheckoutReservationParams) {
  const pathname = usePathname();

  // ===============================
  // ✅ Reserve prefetch state
  // ===============================
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveErr, setReserveErr] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpiresAtSec, setReservationExpiresAtSec] = useState<number | null>(null);
  const [reservationCartHash, setReservationCartHash] = useState<string | null>(null);

  const reserveAbortRef = useRef<AbortController | null>(null);
  const reserveTimerRef = useRef<any>(null);

  // 避免重复打同一个 reserve
  const lastReserveKeyRef = useRef<string>("");
  const lastCartHashRef = useRef<string>("");

  const reservePromiseRef = useRef<Promise<ReserveCache | null> | null>(null);

  // ===============================
  // ✅ When leaving /checkout route, release reservation immediately
  // ===============================
  const prevPathRef = useRef<string>("");

  // ===============================
  // ✅ Release reservation immediately (leave checkout / close tab / refresh)
  // ===============================
  function clearReserveLocalState() {
    clearCheckoutReserveLocalState({
      setReservationId,
      setReservationExpiresAtSec,
      setReservationCartHash,
      setReserveErr,
      setReserveLoading,
      reservePromiseRef,
      lastReserveKeyRef,
    });
  }

  async function releaseReservationNow(reason: string) {
    await releaseCheckoutReservationNow({
      reason,
      reservationId,
      apiURL,
      reserveAbortRef,
      clearReserveLocalState,
    });
  }

  // ===============================
  // ✅ Reserve prefetch core (returns ReserveCache or null)
  // ===============================
  async function doPrefetchReserve(
    reason: string,
    force = false
  ): Promise<ReserveCache | null> {
    return await prefetchCheckoutReserve({
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

  // ✅ NEW: Ensure reserve exactly once (mutex) for Address -> Delivery transition
  async function ensureReserveBeforeNext(): Promise<ReserveCache> {
    return await ensureCheckoutReserveBeforeNext({
      hasItems,
      cart,
      reservationId,
      reservationExpiresAtSec,
      reservationCartHash,
      reservePromiseRef,
      setReserveErr,
      runPrefetch: () => doPrefetchReserve("address_continue", true),
    });
  }

  function schedulePrefetchReserve(reason: string, force = false) {
    scheduleCheckoutReservePrefetch({
      reserveTimerRef,
      reason,
      force,
      runPrefetch: () => doPrefetchReserve(reason, force),
    });
  }

  useEffect(() => {
    // 第一次进来初始化
    if (!prevPathRef.current) {
      prevPathRef.current = pathname;
      return;
    }

    const prev = prevPathRef.current;
    const curr = pathname;

    // ✅ 从 /checkout 跳到别的页面：立即释放
    if (shouldReleaseOnRouteLeave(prev, curr)) {
      void releaseReservationNow("leave_checkout_route");
    }

    prevPathRef.current = curr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ✅ 进入 Address 时自动 prefetch reserve
  useEffect(() => {
    if (step === "address" && hasItems) {
      schedulePrefetchReserve("enter_address");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cartHash]);

  // ✅ 方案 A：cart 变化时只清理旧 reservation（不自动 reserve）
  // reserve 只在 Address 点击 Continue 时发生
  useEffect(() => {
    if (!hasItems) {
      resetReserveForEmptyCart({
        lastCartHashRef,
        setReservationId,
        setReservationExpiresAtSec,
        setReservationCartHash,
        setReserveErr,
        setReserveLoading,
        reservePromiseRef,
      });
      return;
    }

    const nextHash = cartHash || "";
    const prevHash = lastCartHashRef.current;

    if (!nextHash || nextHash === prevHash) return;

    // cart hash 变了：旧 reservation 不可信（清理）
    resetReserveForCartHashChange({
      lastCartHashRef,
      nextHash,
      setReservationId,
      setReservationExpiresAtSec,
      setReservationCartHash,
      setReserveErr,
      setReserveLoading,
      reservePromiseRef,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHash, hasItems]);

  // ✅ 卸载清理：abort + clear timers + release reservation
  useEffect(() => {
    const { onPageHide, onBeforeUnload } = createReserveWindowLifecycleHandlers({
      releaseNow: releaseReservationNow,
    });

    attachReserveWindowLifecycle({
      onPageHide,
      onBeforeUnload,
    });

    return () => {
      // 1) 先释放 reservation（组件卸载）
      void releaseReservationNow("checkout_unmount");

      // 2) 清理监听
      detachReserveWindowLifecycle({
        onPageHide,
        onBeforeUnload,
      });

      // 3) abort reserve & clear timer
      cleanupReserveResources({
        abortReserveRequest: () => {
          try {
            reserveAbortRef.current?.abort();
          } catch {}
        },
        clearReserveTimer: () => {
          try {
            if (reserveTimerRef.current) clearTimeout(reserveTimerRef.current);
          } catch {}
        },
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    reserveLoading,
    reserveErr,
    reservationId,
    reservationExpiresAtSec,
    reservationCartHash,
    ensureReserveBeforeNext,
  };
}