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

  // ✅ NEW: 上层控制禁用（reservation expired / out_of_stock 时用）
  disabled?: boolean;
  disabledText?: string; // 默认 "PayPal unavailable"
};

function getApiBase() {
  const fromEnv =
    (process.env.NEXT_PUBLIC_WORKER_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      "") as string;

  const base = String(fromEnv || "").trim().replace(/\/+$/, "");
  if (base) return base;

  // ✅ 关键：默认跟你的前端 host 保持一致，避免 localhost/127.0.0.1 cookie 不互通
  // 你的页面是 localhost:3000，就默认走 localhost:8787
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost") return "http://localhost:8787";
    if (h === "127.0.0.1") return "http://127.0.0.1:8787";
  }

  return "http://localhost:8787";
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
  "paypal_unavailable",
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

/**
 * ✅ 统一把后端 /orders 的错误响应转成前端可用 err：
 * - 保留后端的 error/message（不再强制 409=out_of_stock）
 * - 永远补上 items fallback（方便 PaymentStep 用 cart/sku 做展示）
 */
function makeOrdersError(resStatus: number, orderResp: any, fallbackItems: any) {
  const backendCode = String(orderResp?.error || orderResp?.code || "").trim();
  const code = backendCode || (resStatus ? `http_${resStatus}` : "http_error");

  // ✅ 优先用后端 message（你后端现在会返回 message）
  const backendMsg = String(orderResp?.message || "").trim();
  const message = backendMsg || (resStatus ? `HTTP ${resStatus}` : "Request failed");

  // ✅ detail：优先 detail，其次把整个响应塞进去（方便你调试/前端做 fallback）
  const detail = {
    ...(orderResp?.detail ?? {}),
    ...(orderResp ?? {}),
    items: fallbackItems ?? null,
  };

  return {
    status: resStatus || 0,
    code,
    message,
    detail,
  };
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
  disabled,
  disabledText,
}: Props) {
  const [{ options }, dispatch] = usePayPalScriptReducer();
  const approvingRef = useRef(false);
  const reservedIdRef = useRef<string | null>(null);
  const creatingRef = useRef(false);

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

  const isDisabled = !!disabled;
  const disabledLabel = (disabledText && String(disabledText).trim()) || "PayPal unavailable";

  return (
    <div className="w-full flex justify-end">
      <div className="w-[260px] max-w-full">
        {isDisabled ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className={[
              "w-full rounded-full px-6 py-3 text-sm font-semibold",
              "bg-neutral-200 text-neutral-500 cursor-not-allowed",
            ].join(" ")}
            title={disabledLabel}
          >
            {disabledLabel}
          </button>
        ) : (
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
              // ✅ safety: 如果 disabled 状态被上层瞬间切换，也直接拒绝
              if (isDisabled) {
                throw makeAbortError("paypal_unavailable");
              }

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
                    const rid = await preflight();
                    reservedIdRef.current = rid || null;
                  } catch (e: any) {
                    const err = {
                      status: Number(e?.status || 409) || 409,
                      code: String(e?.code || e?.error || "preflight_failed"),
                      message: String(e?.message || "Stock preflight failed."),
                      detail: { ...(e?.detail ?? {}), items: preflightItems ?? null },
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
                const capture =
                  (details as any)?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;

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
                  try {
                    await (actions as any)?.order?.void?.();
                  } catch {}
                  approvingRef.current = false;
                  return;
                }

                // ✅ NEW: 统一订单邮箱来源
                // 优先级：
                // 1) PaymentStep 传下来的 checkoutEmail（推荐）
                // 2) accountEmail（备用命名）
                // 3) successMeta.email（更老的备用字段）
                // 4) address.email（游客 checkout）
                const finalOrderEmail = String(
                  successMeta?.checkoutEmail ??
                    successMeta?.accountEmail ??
                    successMeta?.email ??
                    successMeta?.address?.email ??
                    ""
                )
                  .trim()
                  .toLowerCase();

                // ✅ 没有 email 时，前端直接拦住，不再让 /orders 报 400
                if (!finalOrderEmail) {
                  const err = {
                    status: 400,
                    code: "missing_email",
                    message: "Email required for order. Please go back to the Address step and complete your email information.",
                    detail: { successMeta },
                  };
                  onFailed?.(err);
                  try {
                    await (actions as any)?.order?.void?.();
                  } catch {}
                  approvingRef.current = false;
                  return;
                }

                const orderBody = {
                  currency: String(checkoutTotals?.currency || currency).trim().toUpperCase(),
                  items: itemsFromMeta,

                  reservation_id,

                  payment: {
                    provider: "paypal",
                    provider_txn_id: paypalPayload.transactionId,
                    amount_minor: Number(checkoutTotals?.total_minor ?? 0) | 0,
                    status: "captured",
                    raw: paypalPayload.raw,
                  },

                  // ✅ 始终带上最终订单邮箱
                  email: finalOrderEmail,

                  ...(successMeta?.address
                    ? {
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

                  ...(successMeta?.deliveryOption
                    ? { delivery_option: successMeta.deliveryOption }
                    : {}),

                  meta: {
                    ...(successMeta?.meta || {}),
                    __paypal_order_id: paypalPayload.orderId,
                    __reservation_id: reservation_id,
                  },
                };

                console.log("[paypal] posting /orders with reservation_id =", reservation_id, {
                  bodyHasReservationId: !!(orderBody as any)?.reservation_id,
                });

                const { res, data: orderResp } = await postJson(ordersUrl, orderBody);

                // ✅ 非 2xx：用后端的 error/message（不再强制 409=out_of_stock）
                if (!res.ok) {
                  const backendCode = String(orderResp?.error || orderResp?.code || "").trim();
                  const backendMsg =
                    String(orderResp?.message || "").trim() ||
                    (backendCode ? backendCode : `HTTP ${res.status}`);

                  // ✅ 只在“后端没给 code”时才兜底
                  let code = backendCode || "http_error";

                  // ✅ 仅对少数情况做“状态码兜底映射”（可选，但很实用）
                  if (!backendCode && res.status === 409) code = "conflict";

                  const err = {
                    status: res.status,
                    code,
                    message: backendMsg,
                    detail: {
                      ...(orderResp?.detail ?? {}),
                      ...(orderResp ?? {}),
                      items: preflightItems ?? null, // 给 PaymentStep 做 fallback 展示
                    },
                  };

                  onFailed?.(err);

                  try {
                    await (actions as any)?.order?.void?.();
                  } catch {}
                  approvingRef.current = false;
                  return;
                }

                // ✅ 兼容：后端可能返回 ok:true duplicate:true
                const createdOrderId =
                  Number(orderResp?.order?.id ?? orderResp?.id ?? 0) > 0
                    ? Number(orderResp?.order?.id ?? orderResp?.id)
                    : null;

                const merged = successMeta
                  ? { ...paypalPayload, successMeta, order: orderResp, createdOrderId }
                  : { ...paypalPayload, order: orderResp, createdOrderId };

                // ✅ 只调用一次 onSucceeded（避免重复跳转/重复 setState）
                void Promise.resolve(onSucceeded?.(merged));

                // ✅ 关键：这里不再跳转！！！
                // ✅ 只通知上层成功，由 PaymentStep 统一负责 router.replace("/order/confirmation")
                return;
              } catch (e: any) {
                console.error("[paypal] onApprove/capture failed:", e);

                // ✅ 如果上面已经构造过结构化错误（含 status/code/error），直接透传给 PaymentStep
                if (e && (e.status || e.code || e.error)) {
                  onFailed?.(e);
                  approvingRef.current = false;
                  return;
                }

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
        )}
      </div>
    </div>
  );
}
