// src/app/checkout/_components/BraintreeHostedFields.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
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

type FieldErrors = {
  number: boolean;
  expirationDate: boolean;
  cvv: boolean;
};

function clearHostedFieldContainers() {
  ["bf-card-number", "bf-expiration-date", "bf-cvv"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
}

/**
 * 识别“token 过期/失效/授权无效”类错误，用于触发强制刷新 token 并重试一次
 */
function isAuthTokenError(e: any): boolean {
  const msg = String(e?.message || e || "").toLowerCase();

  // 覆盖常见文案：expired / deactivated / invalid authorization
  if (
    msg.includes("expired") ||
    msg.includes("deactivated") ||
    msg.includes("tokenization key") ||
    msg.includes("invalid authorization") ||
    msg.includes("authorization") ||
    msg.includes("client token") ||
    msg.includes("clienttoken")
  ) {
    return true;
  }

  // braintree-web 有时会给更结构化的 error
  const code = String(e?.code || "").toLowerCase();
  if (
    code.includes("authorization") ||
    code.includes("client") ||
    code.includes("token")
  ) {
    return true;
  }

  return false;
}

/**
 * 与方案 2 对齐：
 * - token 缓存由 braintreeToken.ts 管（带 TTL）
 * - 这里仅做“并发单飞”（避免 StrictMode/并行渲染重复打 token 接口）
 */
async function ensureTokenOnce(): Promise<string> {
  if (typeof window === "undefined") return "";

  // 单飞：同一时刻只发一次请求
  if (window.__btTokenPromise) {
    try {
      return (await window.__btTokenPromise) || "";
    } catch {
      delete window.__btTokenPromise;
      return "";
    }
  }

  window.__btTokenPromise = (async () => {
    return await prefetchBraintreeToken();
  })();

  try {
    return (await window.__btTokenPromise) || "";
  } catch {
    delete window.__btTokenPromise;
    return "";
  }
}

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

  // ✅ 抽出来：可复用的创建 HostedFields 方法
  const createHostedFields = async (auth: string) => {
    const braintree = await import("braintree-web");

    // 每次创建前都清空旧 iframe，避免重复 mount
    clearHostedFieldContainers();

    const client = await braintree.client.create({ authorization: auth });

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

    return hf;
  };

  /**
   * ✅ 抽出来：初始化 HostedFields（带一次“过期重试刷新”）
   * 让它既能在 mount 时用，也能在 tokenize 失败后自动恢复时用
   */
  const initHostedFieldsWithRetry = async (
    opts?: { cancelled?: () => boolean }
  ) => {
    // 如果已经有实例了（可能是 StrictMode 第二次执行），直接跳过
    if (hfRef.current) {
      setReady(true);
      return;
    }

    setError(null);
    setReady(false);

    const isCancelled = opts?.cancelled || (() => false);

    // 第一次：用缓存/TTL token
    let auth = await ensureTokenOnce();
    if (!auth) throw new Error("Failed to get clientToken");

    try {
      const hf = await createHostedFields(auth);

      if (isCancelled()) {
        try {
          hf.teardown();
        } catch {}
        return;
      }

      hfRef.current = hf;
      setReady(true);
      return;
    } catch (e: any) {
      // 命中授权类错误：强制刷新 token 后重试一次
      if (!isAuthTokenError(e)) throw e;

      await fetchAndOverwriteBraintreeToken();
      auth = await ensureTokenOnce();
      if (!auth) throw e;

      const hf = await createHostedFields(auth);

      if (isCancelled()) {
        try {
          hf.teardown();
        } catch {}
        return;
      }

      hfRef.current = hf;
      setReady(true);
      return;
    }
  };

  // ========== 初始化 Hosted Fields（mount 时） ==========
  useEffect(() => {
    let cancelled = false;

    initHostedFieldsWithRetry({
      cancelled: () => cancelled,
    }).catch((e) =>
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

  // ✅ 自动恢复：重建 hosted fields（不刷新页面）
  const recoverPaymentSession = async (reason?: any) => {
    // 1) teardown 旧实例
    try {
      hfRef.current?.teardown?.();
    } catch {}
    hfRef.current = null;

    // 2) 清空容器，避免旧 iframe 残留
    clearHostedFieldContainers();

    // 3) 强制拉新 token 并重建
    await fetchAndOverwriteBraintreeToken();
    await initHostedFieldsWithRetry();

    // 4) 给用户一个“软提示”，不自动再扣款（避免重复扣款风险）
    const msg = String(reason?.message || reason || "").trim();
    setError(
      msg
        ? `Payment session refreshed. Please try again. (${msg})`
        : "Payment session refreshed. Please try again."
    );
  };

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
      let nonce: string | null = null;
      let details: any = null;

      try {
        const r = await hfRef.current.tokenize({
          cardholderName: cardholderName || undefined,
        });
        nonce = r?.nonce;
        details = r?.details;
      } catch (e: any) {
        // ✅ 关键：tokenize 阶段授权失效 => 自动恢复（不刷新页面）
        if (isAuthTokenError(e)) {
          await recoverPaymentSession(e);
          setSubmitting(false);
          return;
        }
        throw e;
      }

      if (!nonce) throw new Error("Failed to tokenize card.");

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
