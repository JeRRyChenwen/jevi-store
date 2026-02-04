// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PayPalBigButton.tsx
"use client";

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useEffect, useRef } from "react";

type Props = {
  amount: number; // major, e.g. 104.15
  currency: string; // e.g. "AUD"
  onInitiate?: () => void;

  // ✅ 允许 async：await 它，确保上层 persist + sessionStorage 写完
  onSucceeded?: (payload: any) => void | Promise<void>;

  confirmPath?: string; // default "/order/confirmation"

  // ✅ NEW: 让上层把“权威 totals / cart snapshot”等塞进来，成功后一起回传
  successMeta?: any;
};

export default function PayPalBigButton({
  amount,
  currency,
  onInitiate,
  onSucceeded,
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
              throw new Error(`Invalid amount for PayPal: ${amount}`);
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
              const details = await actions.order?.capture();

              const capture =
                (details as any)?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;

              const normalized = {
                provider: "paypal",
                orderId: data?.orderID ?? (details as any)?.id ?? null,
                transactionId: capture?.id ?? null,
                raw: details ?? null,
                data,
                details,
              };

              // ✅ 把 meta 一起回传（最重要：让父组件别再重算 totals）
              const merged = successMeta
                ? { ...normalized, successMeta }
                : normalized;

              await onSucceeded?.(merged);

              try {
                if (typeof window !== "undefined") {
                  window.location.replace(confirmPath);
                }
              } catch {}
            } catch (e) {
              console.error("[paypal] onApprove/capture failed:", e);
              approvingRef.current = false;
            }
          }}
          onError={(err) => {
            console.error("[paypal] error:", err);
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
