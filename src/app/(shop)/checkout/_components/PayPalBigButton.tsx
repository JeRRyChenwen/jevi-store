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

  // ✅ NEW: 失败：包括 409 缺货、400 金额不一致、500 库存更新失败等
  onFailed?: (err: any) => void;

  confirmPath?: string; // default "/order/confirmation"

  // ✅ 上层传入：权威 totals / cart snapshot / address / delivery_option 等
  // 建议至少包含 checkoutTotals.items（其中要有 product_sku/qty/title/price 等）
  successMeta?: any;
};

function getApiBase() {
  // 你可以按你的项目环境变量名改这一行
  const fromEnv =
    (process.env.NEXT_PUBLIC_WORKER_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      "") as string;

  const base = String(fromEnv || "").trim().replace(/\/+$/, "");
  if (base) return base;

  // 本地 wrangler 默认
  return "http://127.0.0.1:8787";
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 如果你 Worker 有 cookie auth，这句有用；没有也不影响
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

export default function PayPalBigButton({
  amount,
  currency,
  onInitiate,
  onSucceeded,
  onFailed,
  confirmPath = "/order/confirmation",
  successMeta,
}: Props) {
  const [{ options }, dispatch] = usePayPalScriptReducer();
  const approvingRef = useRef(false);

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
          createOrder={(_data, actions) => {
            onInitiate?.();

            if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
              onFailed?.({
                status: 0,
                code: "invalid_amount",
                message: `Invalid amount for PayPal: ${amount}`,
                detail: { amount, currency },
              });
              // 让 PayPal createOrder 失败即可
              return Promise.reject(new Error("invalid_amount"));
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
          }}
          onApprove={async (data, actions) => {
            if (approvingRef.current) return;
            approvingRef.current = true;

            try {
              // 1) PayPal capture
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

              // 2) ✅ capture 成功 ≠ 下单成功
              //    这里必须调用你自己的后端 /orders 建单，且严格判断 res.ok
              //    你后端会做扣库存（你已经做了），缺货就 409
              const checkoutTotals = successMeta?.checkoutTotals;
              const itemsFromMeta = checkoutTotals?.items;

              // 最少需要 items，否则后端根本不知道要扣哪个 sku
              if (!Array.isArray(itemsFromMeta) || itemsFromMeta.length === 0) {
                const err = {
                  status: 0,
                  code: "missing_items",
                  message: "Missing cart items for creating order.",
                  detail: { successMeta },
                };
                console.warn("[paypal][orders] missing items in successMeta", err);
                onFailed?.(err);
                try { await (actions as any)?.order?.void?.(); } catch {}
                approvingRef.current = false;
                return;
              }

              // 你的 Worker /orders 期望的 body（按你 orders.ts 逻辑）
              const orderBody = {
                currency: (checkoutTotals?.currency || currency || "AUD").toUpperCase(),
                items: itemsFromMeta,

                // 传给后端做 amount 校验（orders.ts 里会对比 grand_total_minor）
                payment: {
                  provider: "paypal",
                  provider_txn_id: paypalPayload.transactionId,
                  amount_minor: Number(checkoutTotals?.total_minor ?? 0) | 0,
                  status: "captured",
                  raw: paypalPayload.raw,
                },

                // 地址字段：你后端从 body 拿 email/addr_*（若你没传也能从 cookie/email 推断，但建议传）
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

                // delivery option（你后端会从 body.delivery_option 等字段解析）
                ...(successMeta?.deliveryOption
                  ? { delivery_option: successMeta.deliveryOption }
                  : {}),

                // meta 可选：用于调试/追踪
                meta: {
                  ...(successMeta?.meta || {}),
                  __paypal_order_id: paypalPayload.orderId,
                },
              };

              console.log("[paypal][orders] creating order", {
                url: ordersUrl,
                amount,
                currency,
                items: orderBody.items?.map((x: any) => ({
                  product_sku: x?.product_sku ?? x?.sku ?? null,
                  qty: x?.qty ?? null,
                  title: x?.product_title ?? x?.title ?? null,
                })),
              });

              const { res, data: orderResp } = await postJson(ordersUrl, orderBody);

              if (!res.ok) {
                  const err = {
                    status: res.status,
                    code: orderResp?.error || orderResp?.code || "http_error",
                    message:
                      orderResp?.message ||
                      (res.status === 409 ? "out_of_stock" : `HTTP ${res.status}`),
                    detail: orderResp?.detail ?? orderResp ?? null,
                  };

                  console.warn("[paypal][orders] create order failed", err);

                  // ✅ 1) 先把错误抛给上层（PaymentStep 会弹 alert）
                  onFailed?.(err);

                  // ✅ 2) 尝试终止 PayPal 订单流程，避免用户卡在 PayPal 的 generic error 页面
                  // 不同 SDK/版本下 void 可能不存在，所以用可选链 + try/catch
                  try {
                    await (actions as any)?.order?.void?.();
                  } catch (e) {
                    console.warn("[paypal][orders] actions.order.void failed (ignored):", e);
                  }

                  // ✅ 3) 允许用户再次点击支付
                  approvingRef.current = false;
                  return;
                }

              // 3) ✅ 真正成功：PayPal capture + 后端建单成功
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
