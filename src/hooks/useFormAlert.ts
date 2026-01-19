"use client";

import { useCallback, useMemo, useState } from "react";

export type FormAlertType = "error" | "success" | "info" | "warning";

export type FormAlertState = {
  type: FormAlertType;
  message: string;
};

type SetAlertInput =
  | { type: FormAlertType; message: any }
  | { type: FormAlertType; message?: any }
  | null;

function normalizeMessage(input: any): string {
  if (!input) return "";
  if (typeof input === "string") return input.trim();
  if (typeof input?.message === "string") return input.message.trim();
  if (typeof input?.error === "string") return input.error.trim();
  return "";
}

export function useFormAlert(options?: {
  mapMessage?: (raw: string) => string;
  defaultNetworkError?: string;
}) {
  const mapMessage = options?.mapMessage;
  const defaultNetworkError = options?.defaultNetworkError || "Network or server error.";

  const [alert, setAlertState] = useState<FormAlertState | null>(null);

  const clear = useCallback(() => setAlertState(null), []);

  const setAlert = useCallback(
    (input: SetAlertInput) => {
      if (!input) return setAlertState(null);

      // ✅ normalize 整个 input（兼容 message 为 Error / 任意对象）
      const msg = normalizeMessage(input);
      if (!msg) return setAlertState(null);

      const mapped = mapMessage ? mapMessage(msg) : msg;
      setAlertState({ type: (input as any).type, message: mapped });
    },
    [mapMessage]
  );

  const error = useCallback((message: any) => setAlert({ type: "error", message }), [setAlert]);
  const success = useCallback((message: any) => setAlert({ type: "success", message }), [setAlert]);

  const fromError = useCallback(
    (err: any, fallbackType: FormAlertType = "error") => {
      const msg = normalizeMessage(err) || defaultNetworkError;
      setAlert({ type: fallbackType, message: msg });
    },
    [defaultNetworkError, setAlert]
  );

  const hasAlert = !!alert?.message;

  return useMemo(
    () => ({
      alert,
      hasAlert,
      clear,
      setAlert,
      error,
      success,
      fromError,
    }),
    [alert, clear, error, fromError, hasAlert, setAlert, success]
  );
}
