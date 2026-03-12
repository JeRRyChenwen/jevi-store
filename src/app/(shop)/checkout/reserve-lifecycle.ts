// src/app/(shop)/checkout/reserve-lifecycle.ts

export function shouldReleaseOnRouteLeave(prevPath: string, currPath: string): boolean {
  const wasCheckout = String(prevPath || "").startsWith("/checkout");
  const isCheckout = String(currPath || "").startsWith("/checkout");
  return wasCheckout && !isCheckout;
}

export function createReserveWindowLifecycleHandlers(args: {
  releaseNow: (reason: string) => void | Promise<unknown>;
}) {
  const onPageHide = () => {
    // pagehide 比 beforeunload 更适合 bfcache
    void args.releaseNow("pagehide");
  };

  const onBeforeUnload = () => {
    void args.releaseNow("beforeunload");
  };

  return {
    onPageHide,
    onBeforeUnload,
  };
}

export function attachReserveWindowLifecycle(args: {
  onPageHide: () => void;
  onBeforeUnload: () => void;
}) {
  try {
    window.addEventListener("pagehide", args.onPageHide);
    window.addEventListener("beforeunload", args.onBeforeUnload);
  } catch {}
}

export function detachReserveWindowLifecycle(args: {
  onPageHide: () => void;
  onBeforeUnload: () => void;
}) {
  try {
    window.removeEventListener("pagehide", args.onPageHide);
    window.removeEventListener("beforeunload", args.onBeforeUnload);
  } catch {}
}

export function cleanupReserveResources(args: {
  abortReserveRequest: () => void;
  clearReserveTimer: () => void;
}) {
  try {
    args.abortReserveRequest();
  } catch {}

  try {
    args.clearReserveTimer();
  } catch {}
}