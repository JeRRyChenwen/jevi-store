// src/app/(shop)/checkout/checkout-bootstrap-runtime.ts
import type { Dispatch, SetStateAction } from "react";
import { LS_ADDRESS_KEY } from "./constants";
import {
  addCheckoutPaymentPreconnectHints,
  attachCheckoutAuthSyncListeners,
  restoreCheckoutAddressFromStorage,
} from "./checkout-browser-effects";
import { syncCheckoutAuthState } from "./checkout-side-effects";
import { CURRENT_STOREFRONT } from "@/lib/market/current";

type SetAddress = Dispatch<SetStateAction<any>>;
type SetBoolean = Dispatch<SetStateAction<boolean>>;
type SetString = Dispatch<SetStateAction<string>>;

export async function syncCheckoutAuthStateForPage({
  setIsLoggedIn,
  setAccountEmail,
}: {
  setIsLoggedIn: SetBoolean;
  setAccountEmail: SetString;
}) {
  await syncCheckoutAuthState({
    setIsLoggedIn,
    setAccountEmail,
  });
}

export function runCheckoutPagePreconnect() {
  addCheckoutPaymentPreconnectHints();
}

export function runCheckoutPageBootstrap({
  setAddress,
  setIsLoggedIn,
  setAccountEmail,
}: {
  setAddress: SetAddress;
  setIsLoggedIn: SetBoolean;
  setAccountEmail: SetString;
}) {
  const runSyncAuthState = async () => {
    await syncCheckoutAuthStateForPage({
      setIsLoggedIn,
      setAccountEmail,
    });
  };

  restoreCheckoutAddressFromStorage({
    storageKey: LS_ADDRESS_KEY,
    fallbackCountry: CURRENT_STOREFRONT.primaryCountry,
    setAddress,
  });

  void runSyncAuthState();

  const detach = attachCheckoutAuthSyncListeners({
    syncAuthState: runSyncAuthState,
  });

  return detach;
}