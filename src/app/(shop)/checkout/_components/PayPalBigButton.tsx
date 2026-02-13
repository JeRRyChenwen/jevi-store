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

  // ✅ 点击 PayPal 前先做库存预检（若失败，则 PayPal 不继续 createOrder）
  preflight?: () => Promise<void>;
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

/**
 * ✅ 我们自己定义的“静默终止 createOrder”哨兵
 * - 只要命中这个 sentinel，就不 console.error（不污染右侧红字）
 */
const ABORT_SENTINEL = "PAYPAL_CREATE_ORDER_ABORT";

/**
 * ✅ 我们认可的“可预期 createOrder 终止原因”
 * - 命中这些 code：onError 静默
 */
const QUIET_CREATE_ORDER_CODES = new Set([
  "create_order_in_progress",
  "invalid_amount",
  "preflight_failed",
  "out_of_stock",
  "sku_not_found",
  "stock_lookup_failed",
  "stock_check_failed",
  "missing_items",
]);

function normalizeErrCode(err: any): string {
  // PayPal SDK 有时候传 Error，有时候传 object，有时候 message 是 "[object Object]"
  const code = String(err?.code || "").trim();
  if (code) return code;

  const name = String(err?.name || "").trim();
  if (name && QUIET_CREATE_ORDER_CODES.has(name)) return name;

  const msg = String(err?.message || "").trim();
  if (msg && QUIET_CREATE_ORDER_CODES.has(msg)) return msg;

  return "";
}

/**
 * ✅ 构造一个“可识别、可静默”的 abort 错误
 * - message 含 ABORT_SENTINEL
 * - 同时挂上 code（便于你自己调试）
 */
function makeAbortError(code: string, payload?: any) {
  const e: any = new Error(ABORT_SENTINEL);
  e.code = code || "preflight_failed";
  e.payload = payload ?? null;
  return e;
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

  // ✅ 防止用户连点 PayPal（createOrder/approve 可能被触发多次）
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
            // ✅ 防连点：createOrder 正在跑就终止（不进入 PayPal 流程）
            if (creatingRef.current) {
              // 不用 onFailed：UI 不需要提示“你点太快”
              throw makeAbortError("create_order_in_progress");
            }
            creatingRef.current = true;

            try {
              onInitiate?.();

              // ✅ amount 校验
              if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
                const err = {
                  status: 0,
                  code: "invalid_amount",
                  message: `Invalid amount for PayPal: ${amount}`,
                  detail: { amount, currency },
                };
                onFailed?.(err);
                // 关键：抛“可静默”的 abort error，避免 PayPal SDK 红字
                throw makeAbortError("invalid_amount", err);
              }

              // ✅ Phase 1 Step 3：库存预检（失败直接终止，不进入 PayPal）
              if (preflight) {
                try {
                  // 如果你也嫌 console 吵，可以删掉这两行
                  // console.log("[paypal][preflight] checking stock…", { items: preflightItems ?? null });
                  await preflight();
                  // console.log("[paypal][preflight] ok");
                } catch (e: any) {
                  const err = {
                    status: Number(e?.status || 409) || 409,
                    code: String(e?.code || "preflight_failed"),
                    message: e?.message || "Stock preflight failed.",
                    detail: e?.detail ?? e ?? null,
                  };

                  // ✅ 交给 PaymentStep 展示
                  onFailed?.(err);

                  // ✅ 抛“可静默”的 abort error（这一步是降噪关键）
                  throw makeAbortError(err.code, err);
                }
              }

              // ✅ 继续走 PayPal create order
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
              // 1) PayPal capture
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

              // 2) capture 成功 ≠ 下单成功：调用你自己的后端 /orders 建单
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

              const orderBody = {
                currency: (checkoutTotals?.currency || currency || "AUD").toUpperCase(),
                items: itemsFromMeta,

                payment: {
                  provider: "paypal",
                  provider_txn_id: paypalPayload.transactionId,
                  amount_minor: Number(checkoutTotals?.total_minor ?? 0) | 0,
                  status: "captured",
                  raw: paypalPayload.raw,
                },

                ...(successMeta?.address
                  ? {
                      email: String(successMeta.address?.email || "")
                        .trim()
                        .toLowerCase(),
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
                },
              };

              const { res, data: orderResp } = await postJson(ordersUrl, orderBody);

              if (!res.ok) {
                const err = {
                  status: res.status,
                  code: orderResp?.error || orderResp?.code || "http_error",
                  message: orderResp?.message || (res.status === 409 ? "out_of_stock" : `HTTP ${res.status}`),
                  detail: orderResp?.detail ?? orderResp ?? null,
                };

                onFailed?.(err);

                // 尽力 void 掉 PayPal order
                try {
                  await (actions as any)?.order?.void?.();
                } catch {}

                approvingRef.current = false;
                return;
              }

              // 3) 真正成功
              const merged = successMeta ? { ...paypalPayload, successMeta, order: orderResp } : { ...paypalPayload, order: orderResp };

              await onSucceeded?.(merged);

              try {
                if (typeof window !== "undefined") {
                  window.location.replace(confirmPath);
                }
              } catch {}
            } catch (e: any) {
              // 这里是“真的 capture 失败”才需要打 error
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
            // ✅ 关键：静默掉“我们自己主动终止 createOrder 的错误”
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

            // ✅ 其他真实错误：保留
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
            approvingRef.current = false;
          }}
        />
      </div>
    </div>
  );
}
