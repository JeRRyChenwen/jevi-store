// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PayPalBigButton.tsx
"use client";

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  amount: number; // major, e.g. 104.15
  currency: string; // e.g. "AUD"

  onInitiate?: () => void;

  // ✅ 成功：只有当“PayPal capture + 后端建单成功”才会触发
  onSucceeded?: (payload: any) => void | Promise<void>;

  // ✅ 失败：包括 409 缺货、400 金额不一致、500 库存更新失败等
  onFailed?: (err: any) => void;

  confirmPath?: string; // default "/order/confirmation"

  // ✅ 上层传入：权威 totals / cart snapshot / address / delivery_option 等
  successMeta?: any;

  // ✅ 点击 PayPal 前先做库存预检/预留（若失败，则 PayPal 不继续 createOrder）
  preflight?: () => Promise<string>;
  preflightItems?: Array<{ sku: string; qty: number }>;
};

function getApiBase() {
  const fromEnv =
    (process.env.NEXT_PUBLIC_WORKER_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "") as string;

  const base = String(fromEnv || "")
    .trim()
    .replace(/\/+$/, "");
  if (base) return base;

  return "http://127.0.0.1:8787";
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { res, data };
}

const ABORT_SENTINEL = "PAYPAL_CREATE_ORDER_ABORT";

const QUIET_CREATE_ORDER_CODES = new Set([
  "create_order_in_progress",
  "invalid_amount",
  "preflight_failed",
  "out_of_stock",
  "sku_not_found",
  "stock_lookup_failed",
  "stock_check_failed",
  "missing_items",
  "paypal_cancelled",
]);

function normalizeErrCode(err: any): string {
  const code = String(err?.code || "").trim();
  if (code) return code;

  const name = String(err?.name || "").trim();
  if (name && QUIET_CREATE_ORDER_CODES.has(name)) return name;

  const msg = String(err?.message || "").trim();
  if (msg && QUIET_CREATE_ORDER_CODES.has(msg)) return msg;

  return "";
}

function makeAbortError(code: string, payload?: any) {
  const e: any = new Error(ABORT_SENTINEL);
  e.code = code || "preflight_failed";
  e.payload = payload ?? null;
  return e;
}

function pickReservationId(meta: any): string | null {
  const v =
    meta?.reservation_id ??
    meta?.reservationId ??
    meta?.inventory_reservation_id ??
    meta?.inventoryReservationId ??
    meta?.meta?.reservation_id ??
    meta?.meta?.reservationId ??
    null;

  const s = String(v || "").trim();
  return s ? s : null;
}

export default function PayPalBigButton({
  amount,
  currency,
  onInitiate,
  onSucceeded,
  onFailed,
  confirmPath = "/order/confirmation",
  successMeta,
  preflight,
  preflightItems,
}: Props) {
  const [{ options }, dispatch] = usePayPalScriptReducer();
  const approvingRef = useRef(false);
  const reservedIdRef = useRef<string | null>(null);
  const creatingRef = useRef(false);
  const reservationRef = useRef<string | null>(null); 

  useEffect(() => {
    if (!options || !currency) return;

    const currentCurrency = (options as any).currency;
    if (currentCurrency === currency) return;

    (dispatch as any)({
      type: "resetOptions" as any,
      value: { ...(options as any), currency },
    });
  }, [currency, options, dispatch]);

  const value = Number(amount || 0).toFixed(2);

  const apiBase = useMemo(() => getApiBase(), []);
  const ordersUrl = useMemo(() => `${apiBase}/orders`, [apiBase]);
  reservationRef.current = pickReservationId(successMeta);

  return (
    <div className="w-full flex justify-end">
      <div className="w-[260px] max-w-full">
        <PayPalButtons
          className="w-full"
          style={{
            layout: "horizontal",
            height: 37,
            color: "gold",
            shape: "pill",
            label: "pay",
            tagline: false,
          }}
          forceReRender={[value, currency]}
          createOrder={async (_data, actions) => {
            if (creatingRef.current) {
              throw makeAbortError("create_order_in_progress");
            }
            creatingRef.current = true;

            try {
              onInitiate?.();

              if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
                const err = {
                  status: 0,
                  code: "invalid_amount",
                  message: `Invalid amount for PayPal: ${amount}`,
                  detail: { amount, currency },
                };
                onFailed?.(err);
                throw makeAbortError("invalid_amount", err);
              }

              // ✅ Phase 2：reserve preflight（由 PaymentStep 实现）
              if (preflight) {
                try {
                  const rid = await preflight();           // ✅ NEW
                  reservedIdRef.current = rid || null;     // ✅ NEW
                } catch (e: any) {
                  const err = {
                    status: Number(e?.status || 409) || 409,
                    code: String(e?.code || e?.error || "preflight_failed"),
                    message: e?.message || "Stock preflight failed.",
                    detail: e?.detail ?? e ?? null,
                  };

                  onFailed?.(err);
                  throw makeAbortError(err.code, err);
                }
              }

              return actions.order.create({
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: {
                      value: Number(amount).toFixed(2),
                      currency_code: currency,
                    },
                  },
                ],
              } as any);
            } finally {
              creatingRef.current = false;
            }
          }}
          onApprove={async (data, actions) => {
            if (approvingRef.current) return;
            approvingRef.current = true;

            try {
              const details = await actions.order?.capture();
              const capture = (details as any)?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;

              const paypalPayload = {
                provider: "paypal",
                orderId: data?.orderID ?? (details as any)?.id ?? null,
                transactionId: capture?.id ?? null,
                raw: details ?? null,
                data,
                details,
              };

              const checkoutTotals = successMeta?.checkoutTotals;
              const itemsFromMeta = checkoutTotals?.items;

              if (!Array.isArray(itemsFromMeta) || itemsFromMeta.length === 0) {
                const err = {
                  status: 0,
                  code: "missing_items",
                  message: "Missing cart items for creating order.",
                  detail: { successMeta },
                };
                onFailed?.(err);
                try {
                  await (actions as any)?.order?.void?.();
                } catch {}
                approvingRef.current = false;
                return;
              }

              const reservation_id = reservedIdRef.current || pickReservationId(successMeta);

              if (!reservation_id) {
                const err = {
                  status: 400,
                  code: "missing_reservation_id",
                  message: "Missing reservation_id when creating order.",
                  detail: { successMeta },
                };
                onFailed?.(err);
                try { await (actions as any)?.order?.void?.(); } catch {}
                approvingRef.current = false;
                return;
              }

              const orderBody = {
                currency: (checkoutTotals?.currency || currency || "AUD").toUpperCase(),
                items: itemsFromMeta,

                ...(reservation_id ? { reservation_id } : {}),

                payment: {
                  provider: "paypal",
                  provider_txn_id: paypalPayload.transactionId,
                  amount_minor: Number(checkoutTotals?.total_minor ?? 0) | 0,
                  status: "captured",
                  raw: paypalPayload.raw,
                },

                ...(successMeta?.address
                  ? {
                      email: String(successMeta.address?.email || "").trim().toLowerCase(),
                      first_name: successMeta.address?.firstName ?? null,
                      last_name: successMeta.address?.lastName ?? null,
                      phone: successMeta.address?.phone ?? null,
                      addr_line1: successMeta.address?.line1 ?? null,
                      addr_line2: successMeta.address?.line2 ?? null,
                      addr_city: successMeta.address?.city ?? null,
                      addr_state: successMeta.address?.state ?? null,
                      addr_postcode: successMeta.address?.postcode ?? null,
                      addr_country: successMeta.address?.country ?? null,
                    }
                  : {}),

                ...(successMeta?.deliveryOption ? { delivery_option: successMeta.deliveryOption } : {}),

                meta: {
                  ...(successMeta?.meta || {}),
                  __paypal_order_id: paypalPayload.orderId,
                  ...(reservation_id ? { __reservation_id: reservation_id } : {}),
                },
              };

              console.log("[paypal] creating order with reservation", {
                reservation_id,
                hasReservation: !!reservation_id,
              });

              console.log("[paypal] posting /orders with reservation_id =", reservation_id, {
                bodyHasReservationId: !!(orderBody as any)?.reservation_id,
              });

              const { res, data: orderResp } = await postJson(ordersUrl, orderBody);

              if (!res.ok) {
                const err = {
                  status: res.status,
                  code: orderResp?.error || orderResp?.code || "http_error",
                  message: orderResp?.message || (res.status === 409 ? "out_of_stock" : `HTTP ${res.status}`),
                  detail: orderResp?.detail ?? orderResp ?? null,
                };

                onFailed?.(err);

                try {
                  await (actions as any)?.order?.void?.();
                } catch {}

                approvingRef.current = false;
                return;
              }

              const merged = successMeta
                ? { ...paypalPayload, successMeta, order: orderResp }
                : { ...paypalPayload, order: orderResp };

              await onSucceeded?.(merged);

              try {
                if (typeof window !== "undefined") {
                  window.location.replace(confirmPath);
                }
              } catch {}
            } catch (e: any) {
              console.error("[paypal] onApprove/capture failed:", e);

              onFailed?.({
                status: 0,
                code: "paypal_capture_failed",
                message: e?.message || "PayPal capture failed.",
                detail: e,
              });

              approvingRef.current = false;
            }
          }}
          onError={(err) => {
            const msg = String((err as any)?.message || "");
            if (msg.includes(ABORT_SENTINEL)) {
              approvingRef.current = false;
              return;
            }

            const code = normalizeErrCode(err);
            if (code && QUIET_CREATE_ORDER_CODES.has(code)) {
              approvingRef.current = false;
              return;
            }

            console.error("[paypal] error:", err);

            onFailed?.({
              status: 0,
              code: "paypal_error",
              message: "PayPal error.",
              detail: err,
            });

            approvingRef.current = false;
          }}
          onCancel={() => {
            onFailed?.({
              status: 0,
              code: "paypal_cancelled",
              message: "Payment cancelled.",
              detail: null,
            });

            approvingRef.current = false;
          }}
        />
      </div>
    </div>
  );
}
