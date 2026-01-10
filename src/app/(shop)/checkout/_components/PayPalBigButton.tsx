// src/app/checkout/_components/PayPalBigButton.tsx
"use client";

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useEffect } from "react";

type Props = {
  amount: number; // 例如 425（单位：major）
  currency: string; // 例如 "AUD"
  onInitiate?: () => void; // 开始创建订单时回调（可以做 loading）
  onSucceeded?: (details: any) => void; // 支付完成回调
};

export default function PayPalBigButton({
  amount,
  currency,
  onInitiate,
  onSucceeded,
}: Props) {
  const [{ options }, dispatch] = usePayPalScriptReducer();

  // ✅ 只在 currency 真正变化时重置 PayPal SDK 选项，避免无限循环
  useEffect(() => {
    if (!options || !currency) return;

    const currentCurrency = (options as any).currency;
    if (currentCurrency === currency) return;

    (dispatch as any)({
      type: "resetOptions" as any,
      value: {
        ...(options as any),
        currency,
      },
    });
  }, [currency, options, dispatch]);

  const value = amount.toFixed(2); // "425.00"

  return (
    <div className="w-full flex justify-end">
      {/* 👉 宽度和 Pay now 外层保持完全一致 */}
      <div className="w-[260px] max-w-full">
        <PayPalButtons
          // 让按钮在容器里占满宽度
          className="w-full"
          // 让外观尽量贴近你现在的 “Pay now” 大圆角按钮
          style={{
            layout: "horizontal",
            height: 37, // 接近 py-3 的视觉高度
            color: "gold",
            shape: "pill", // 和 rounded-full 类似
            label: "pay", // 显示 “Pay with PayPal”
            tagline: false, // 去掉下面那行小字，视觉上更接近单一按钮
          }}
          forceReRender={[amount, currency]}
          createOrder={(_data, actions) => {
            onInitiate?.();

            const value = amount.toFixed(2); // 比如 "425.00"

            return actions.order.create(
              {
                intent: "CAPTURE",
                purchase_units: [
                  {
                    amount: {
                      value,
                      currency_code: currency,
                    },
                  },
                ],
              } as any
            );
          }}
          onApprove={async (_data, actions) => {
            const details = await actions.order?.capture();
            onSucceeded?.(details ?? _data);
          }}
        />
      </div>
    </div>
  );
}
