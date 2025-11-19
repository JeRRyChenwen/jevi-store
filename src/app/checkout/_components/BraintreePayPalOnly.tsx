// src/app/checkout/_components/BraintreePayPalOnly.tsx
"use client";

/**
 * ⚠️ 注意：
 * 这个组件已经废弃，仅保留一个空壳，避免在浏览器里直接请求
 * Braintree / PayPal 的 API，导致 CORS 报错。
 *
 * 现在请使用：
 *   - <BraintreeDropIn ... />
 * 配合 /api/braintree/checkout 这个后端路由来完成所有支付逻辑。
 */

type Props = {
  amount: number;           // 单位: 元（如 1275.00）
  currency: string;         // "AUD"
  onSucceeded?: (r: { id: string }) => void;
  onInitiate?: () => void;
  enabled?: boolean;        // 只在 payment 步骤传 true
};

export default function BraintreePayPalOnly(_: Props) {
  // if (process.env.NODE_ENV === "development") {
  //   console.warn(
  //     "[BraintreePayPalOnly] 已废弃，请改用 <BraintreeDropIn> 组件。" +
  //       "这个组件现在不会再渲染 PayPal 按钮，也不会发任何网络请求。"
  //   );
  // }

  // 返回一个什么都不显示的占位（防止布局抖动可以留一个小 div）
  return (
    <div
      style={{ width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
    />
  );
}
