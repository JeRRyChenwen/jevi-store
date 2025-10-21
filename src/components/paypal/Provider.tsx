// src/components/paypal/Provider.tsx
"use client";

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import React from "react";

type Props = {
  children: React.ReactNode;
};

/**
 * 用于在客户端注入 PayPal JS SDK 的 Provider。
 * 只能在 Client Component 中使用，所以单独封装一个。
 */
export default function PayPalProvider({ children }: Props) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  // 防御：没有配置 clientId 时，不要挂 SDK，避免报错
  if (!clientId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[PayPal] NEXT_PUBLIC_PAYPAL_CLIENT_ID is missing. PayPal buttons will not render."
      );
    }
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "AUD",
        intent: "capture",
        components: "buttons",
        // 需要的话可以禁用某些 funding 来源
        // disableFunding: "card,credit",
        // enableFunding: "paypal,venmo",
        // locale: "en_AU",
        commit: true,
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
