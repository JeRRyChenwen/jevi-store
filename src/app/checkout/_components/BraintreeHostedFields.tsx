// src/app/checkout/_components/BraintreeHostedFields.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  readCachedBraintreeToken,
  prefetchBraintreeToken,
  fetchAndOverwriteBraintreeToken,
} from "@/lib/braintreeToken";

type Props = {
  amount: number;
  currency: string;
  onSucceeded?: (r: { id: string } | any) => void;
  onInitiate?: () => void;
  // 统一使用外层 Pay now 按钮
  onExposePay?: (pay: () => void) => void;
  onCanPayChange?: (can: boolean) => void;
};

declare global {
  interface Window {
    __btTokenPromise?: Promise<string>;
  }
}

const STORAGE_KEY = "bt:clientToken";

// 与 PayPal 组件一致：只在前端会话内取一次 token（并缓存）
async function ensureTokenOnce(): Promise<string> {
  if (typeof window === "undefined") return "";
  const cached =
    readCachedBraintreeToken?.() || sessionStorage.getItem(STORAGE_KEY);
  if (cached) return cached;

  if (window.__btTokenPromise) {
    try {
      const t = await window.__btTokenPromise;
      if (t) sessionStorage.setItem(STORAGE_KEY, t);
      return t || "";
    } catch {
      delete window.__btTokenPromise;
      return "";
    }
  }

  window.__btTokenPromise = (async () => {
    const res = await prefetchBraintreeToken();
    const token =
      typeof res === "string" ? res : (res as any)?.clientToken || "";
    if (token) sessionStorage.setItem(STORAGE_KEY, token);
    return token;
  })();

  try {
    return await window.__btTokenPromise;
  } catch {
    delete window.__btTokenPromise;
    return "";
  }
}

type FieldErrors = {
  number: boolean;
  expirationDate: boolean;
  cvv: boolean;
};

export default function BraintreeHostedFields({
  amount,
  currency,
  onSucceeded,
  onInitiate,
  onExposePay,
  onCanPayChange,
}: Props) {
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Cardholder Name 普通输入框
  const [cardholderName, setCardholderName] = useState("");

  // ✅ 提交时统一校验用：记录哪些字段有错误
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    number: false,
    expirationDate: false,
    cvv: false,
  });

  const hfRef = useRef<any>(null);

  const onSucceededRef = useRef<Props["onSucceeded"] | undefined>(undefined);
  const onInitiateRef = useRef<Props["onInitiate"] | undefined>(undefined);
  const onExposePayRef = useRef<Props["onExposePay"] | undefined>(undefined);
  const onCanPayChangeRef = useRef<Props["onCanPayChange"] | undefined>(
    undefined
  );

  onSucceededRef.current = onSucceeded;
  onInitiateRef.current = onInitiate;
  onExposePayRef.current = onExposePay;
  onCanPayChangeRef.current = onCanPayChange;

  // ========== 初始化 Hosted Fields ==========
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      // 如果已经有实例了（可能是 StrictMode 第二次执行），直接跳过
      if (hfRef.current) {
        setReady(true);
        return;
      }

      setError(null);
      setReady(false);

      // 1) client token
      let auth = await ensureTokenOnce();
      if (!auth) {
        try {
          await fetchAndOverwriteBraintreeToken();
          auth = await ensureTokenOnce();
        } catch {}
      }
      if (!auth) throw new Error("Failed to get clientToken");

      // 2) braintree client + hosted fields
      const braintree = await import("braintree-web");
      const client = await braintree.client.create({ authorization: auth });

      // ⚠️ 保险：创建之前把容器里的旧 iframe 清空一下
      ["bf-card-number", "bf-expiration-date", "bf-cvv"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.innerHTML = "";
        }
      });

      const hf = await braintree.hostedFields.create({
        client,
        styles: {
          input: {
            "font-size": "14px",
            "line-height": "20px",
            "font-family":
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            color: "#111827",
          },
          ":focus": { color: "#111827" },
          ".invalid": { color: "#111827" },
          ".valid": { color: "#111827" },
          "::-ms-clear": { display: "none" },
        },
        fields: {
          number: {
            selector: "#bf-card-number",
            placeholder: "4111 1111 1111 1111",
          },
          expirationDate: {
            selector: "#bf-expiration-date",
            placeholder: "MM/YY",
          },
          cvv: { selector: "#bf-cvv", placeholder: "CVC" },
        },
      });

      if (cancelled) {
        try {
          hf.teardown();
        } catch {}
        return;
      }

      hfRef.current = hf;
      setReady(true);
    };

    boot().catch((e) =>
      setError((e as any)?.message || "Failed to init card fields")
    );

    return () => {
      cancelled = true;
      const hf = hfRef.current;
      hfRef.current = null;
      try {
        hf?.teardown?.();
      } catch {}
    };
    // 这里只依赖挂载/卸载，不再因为 amount/currency 变化而重复创建
  }, []);

  // === 内部真正的支付逻辑（点击 Pay now 时调用） ===
  const onPay = async () => {
    if (!hfRef.current || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      // 每次提交前先清空上一次的 field error
      setFieldErrors({
        number: false,
        expirationDate: false,
        cvv: false,
      });

      // ✅ 提交时统一校验：先看 HostedFields 的状态，不合法就直接提示
      try {
        const state = hfRef.current.getState?.();
        const f = state?.fields;

        if (f) {
          const nextErrors: FieldErrors = {
            number: !f.number?.isValid,
            expirationDate: !f.expirationDate?.isValid,
            cvv: !f.cvv?.isValid,
          };

          if (
            nextErrors.number ||
            nextErrors.expirationDate ||
            nextErrors.cvv ||
            !cardholderName.trim()
          ) {
            setFieldErrors(nextErrors);
            setError("Please check your card details and try again.");
            setSubmitting(false);
            return;
          }
        }
      } catch {
        // getState 失败就退回到后面的 tokenization 校验
      }

      onInitiateRef.current?.();

      // 通过本地校验后，再 tokenize（取 nonce）
      const { nonce, details } = await hfRef.current.tokenize({
        cardholderName: cardholderName || undefined,
      });

      // 调现有结算 API
      const res = await fetch("/api/braintree/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nonce,
          amount,
          currency: currency.toUpperCase(),
          meta: {
            method: "hosted_fields",
            cardType: details?.cardType || null,
            cardholderName: cardholderName || null,
          },
        }),
        keepalive: true,
      });

      const out = await res.json().catch(() => ({} as any));
      if (!res.ok || out?.error || out?.ok === false) {
        throw new Error(out?.error || `Payment failed (${res.status})`);
      }

      // 把更多信息往外传，给订单写入 card_brand / card_last4 用
      const txId = out?.transactionId || out?.id || null;

      const cardBrand =
        out?.cardBrand ??
        out?.card_brand ??
        (details as any)?.cardType ??
        null;

      const cardLast4 =
        out?.cardLast4 ??
        out?.card_last4 ??
        (details as any)?.last4 ??
        (details as any)?.lastFour ??
        null;

      const payload = {
        id: txId,
        transactionId: txId,
        paymentMethod: out?.paymentMethod || "card",
        cardBrand,
        cardLast4,
        currency: out?.currency ?? currency.toUpperCase(),
        amount: out?.amount ?? amount,
        raw: out,
      };

      onSucceededRef.current?.(payload);
    } catch (e: any) {
      setError(e?.message || "Card payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  // 外部 Pay now 是否可点击（不依赖字段合法性，只要字段 mounted + 有姓名）
  const disabled = !ready || submitting || !cardholderName.trim();

  // 把 pay 函数暴露给外部（PaymentStep 会用统一的 Pay now 按钮调用）
  useEffect(() => {
    if (!onExposePayRef.current) return;
    onExposePayRef.current(() => {
      void onPay();
    });
  }, [ready, submitting, cardholderName]);

  // 把是否可支付状态告诉外部，用来控制 Pay now 的 disabled
  useEffect(() => {
    onCanPayChangeRef.current?.(!disabled);
  }, [disabled]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-900">
        Pay with debit or credit card
      </div>

      {/* Cardholder Name 普通输入框 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm"
          placeholder="Name on card"
          autoComplete="cc-name"
        />
      </div>

      {/* Hosted Fields 容器（Braintree 会把 iframe 嵌入到这些 div 里） */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Card number
            </label>
            <div
              id="bf-card-number"
              className={[
                "h-10 rounded-md border px-3 flex items-center bg-white",
                fieldErrors.number ? "border-red-500" : "border-gray-300",
              ].join(" ")}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Expiry</label>
            <div
              id="bf-expiration-date"
              className={[
                "h-10 rounded-md border px-3 flex items-center bg-white",
                fieldErrors.expirationDate
                  ? "border-red-500"
                  : "border-gray-300",
              ].join(" ")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">CVC</label>
            <div
              id="bf-cvv"
              className={[
                "h-10 rounded-md border px-3 flex items-center bg-white",
                fieldErrors.cvv ? "border-red-500" : "border-gray-300",
              ].join(" ")}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      )}
    </div>
  );
}
