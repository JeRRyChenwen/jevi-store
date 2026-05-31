// D:\前端练习\social-platform\src\app\(shop)\checkout\_components\PayPalBigButton.tsx
"use client";

import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  amount: number; // major, e.g. 104.15
  currency: string; // e.g. "AUD"

  onInitiate?: () => void;

  // ✅ 成功：只有当“后端 PayPal capture + 后端建单成功”才会触发
  onSucceeded?: (payload: any) => void | Promise<void>;

  // ✅ 失败：包括库存预留失败、checkout session 创建失败、PayPal capture 失败等
  onFailed?: (err: any) => void;

  confirmPath?: string; // default "/order/confirmation"

  // ✅ 上层传入：权威 totals / cart snapshot / address / delivery_option 等
  successMeta?: any;

  // ✅ 点击 PayPal 前先做库存预检/预留（若失败，则 PayPal 不继续 createOrder）
  preflight?: () => Promise<string>;
  preflightItems?: Array<{ sku: string; qty: number }>;

  // ✅ 上层控制禁用（reservation expired / out_of_stock / cookie 未同意等）
  disabled?: boolean;
  disabledText?: string;
};

function getApiBase() {
  const fromEnv = (process.env.NEXT_PUBLIC_WORKER_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "") as string;

  const base = String(fromEnv || "")
    .trim()
    .replace(/\/+$/, "");

  if (base) return base;

  // ✅ 本地开发默认直连 d1-worker
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
    body: JSON.stringify(body ?? {}),
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
  "missing_email",
  "missing_reservation_id",
  "checkout_session_create_failed",
  "checkout_session_not_found",
  "checkout_session_expired",
  "checkout_session_invalid_state",
  "paypal_cancelled",
  "paypal_unavailable",
]);

function normalizeErrCode(err: any): string {
  const code = String(err?.code || err?.error || "").trim();
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

function pickCheckoutEmail(meta: any): string {
  return String(
    meta?.checkoutEmail ??
      meta?.accountEmail ??
      meta?.email ??
      meta?.address?.email ??
      "",
  )
    .trim()
    .toLowerCase();
}

function normalizeCheckoutAddress(address: any, email: string) {
  const a = address || {};

  return {
    email,

    first_name:
      a.first_name ?? a.firstName ?? a.given_name ?? a.givenName ?? null,

    last_name:
      a.last_name ??
      a.lastName ??
      a.surname ??
      a.family_name ??
      a.familyName ??
      null,

    phone: a.phone ?? a.phone_number ?? a.phoneNumber ?? null,

    line1: a.line1 ?? a.address_line1 ?? a.addressLine1 ?? a.addr_line1 ?? null,

    line2: a.line2 ?? a.address_line2 ?? a.addressLine2 ?? a.addr_line2 ?? "",

    city: a.city ?? a.suburb ?? a.addr_city ?? null,

    state: a.state ?? a.province ?? a.region ?? a.addr_state ?? null,

    postcode:
      a.postcode ?? a.postal_code ?? a.postalCode ?? a.addr_postcode ?? null,

    country:
      a.country ?? a.country_code ?? a.countryCode ?? a.addr_country ?? null,
  };
}

function makeBackendError(
  resStatus: number,
  data: any,
  fallbackCode: string,
  fallbackMessage: string,
) {
  const backendCode = String(data?.error || data?.code || "").trim();
  const code = backendCode || fallbackCode;

  const backendMsg = String(data?.message || "").trim();
  const message =
    backendMsg ||
    fallbackMessage ||
    (resStatus ? `HTTP ${resStatus}` : "Request failed");

  return {
    status: resStatus || 0,
    code,
    message,
    detail: data ?? null,
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
  const creatingRef = useRef(false);

  const reservationIdRef = useRef<string | null>(null);
  const checkoutSessionTokenRef = useRef<string | null>(null);
  const checkoutSessionRef = useRef<any>(null);

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

  const isDisabled = !!disabled;
  const disabledLabel =
    (disabledText && String(disabledText).trim()) || "PayPal unavailable";

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
            createOrder={async () => {
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

                const checkoutTotals = successMeta?.checkoutTotals;
                const itemsFromMeta = checkoutTotals?.items;

                if (
                  !Array.isArray(itemsFromMeta) ||
                  itemsFromMeta.length === 0
                ) {
                  const err = {
                    status: 0,
                    code: "missing_items",
                    message: "Missing cart items for checkout session.",
                    detail: { successMeta, preflightItems },
                  };

                  onFailed?.(err);
                  throw makeAbortError("missing_items", err);
                }

                const finalCheckoutEmail = pickCheckoutEmail(successMeta);

                if (!finalCheckoutEmail) {
                  const err = {
                    status: 400,
                    code: "missing_email",
                    message:
                      "Email required for order. Please go back to the Address step and complete your email information.",
                    detail: { successMeta },
                  };

                  onFailed?.(err);
                  throw makeAbortError("missing_email", err);
                }

                // ✅ 1. 先确保库存 reservation 存在
                let reservationId: string | null = null;

                if (preflight) {
                  try {
                    const rid = await preflight();
                    reservationId = String(rid || "").trim() || null;
                  } catch (e: any) {
                    const err = {
                      status: Number(e?.status || 409) || 409,
                      code: String(e?.code || e?.error || "preflight_failed"),
                      message: String(e?.message || "Stock preflight failed."),
                      detail: {
                        ...(e?.detail ?? {}),
                        items: preflightItems ?? null,
                      },
                    };

                    onFailed?.(err);
                    throw makeAbortError(err.code, err);
                  }
                }

                reservationId = reservationId || pickReservationId(successMeta);

                if (!reservationId) {
                  const err = {
                    status: 400,
                    code: "missing_reservation_id",
                    message:
                      "Missing reservation_id when creating checkout session.",
                    detail: { successMeta },
                  };

                  onFailed?.(err);
                  throw makeAbortError("missing_reservation_id", err);
                }

                reservationIdRef.current = reservationId;

                const normalizedAddress = normalizeCheckoutAddress(
                  successMeta?.address,
                  finalCheckoutEmail,
                );

                const checkoutCurrency = String(
                  checkoutTotals?.currency || currency || "",
                )
                  .trim()
                  .toUpperCase();

                const deliveryOption = String(
                  successMeta?.deliveryOption || "standard",
                )
                  .trim()
                  .toLowerCase();

                // ✅ 2. 创建 server-side checkout session
                const checkoutSessionBody = {
                  email: finalCheckoutEmail,
                  currency: checkoutCurrency,
                  reservation_id: reservationId,
                  items: itemsFromMeta,
                  address: normalizedAddress,
                  shipping_address: normalizedAddress,
                  delivery_option: deliveryOption,

                  // 可选：方便后端 snapshot/debug
                  checkout_totals: checkoutTotals ?? null,
                  meta: {
                    ...(successMeta?.meta || {}),
                    __source: "frontend_paypal_button_checkout_session",
                  },
                };

                const { res: sessionRes, data: sessionResp } = await postJson(
                  `${apiBase}/checkout/sessions`,
                  checkoutSessionBody,
                );

                if (!sessionRes.ok || !sessionResp?.ok) {
                  const err = makeBackendError(
                    sessionRes.status,
                    sessionResp,
                    "checkout_session_create_failed",
                    "Failed to create checkout session.",
                  );

                  onFailed?.(err);
                  throw makeAbortError(err.code, err);
                }

                const checkoutSession =
                  sessionResp?.checkout_session || sessionResp?.checkoutSession;

                const sessionToken = String(
                  checkoutSession?.session_token ||
                    checkoutSession?.sessionToken ||
                    "",
                ).trim();

                if (!sessionToken) {
                  const err = {
                    status: sessionRes.status || 500,
                    code: "missing_checkout_session_token",
                    message:
                      "Checkout session was created but no session token was returned.",
                    detail: sessionResp,
                  };

                  onFailed?.(err);
                  throw makeAbortError(err.code, err);
                }

                checkoutSessionTokenRef.current = sessionToken;
                checkoutSessionRef.current = checkoutSession;

                // ✅ 3. 让 d1-worker 根据 checkout_session.grand_total_minor 创建 PayPal order
                const { res: paypalCreateRes, data: paypalCreateResp } =
                  await postJson(
                    `${apiBase}/checkout/sessions/${encodeURIComponent(
                      sessionToken,
                    )}/paypal/create-order`,
                    {},
                  );

                if (!paypalCreateRes.ok || !paypalCreateResp?.ok) {
                  const err = makeBackendError(
                    paypalCreateRes.status,
                    paypalCreateResp,
                    "paypal_create_order_failed",
                    "Failed to create PayPal order.",
                  );

                  onFailed?.(err);
                  throw makeAbortError(err.code, err);
                }

                const paypalOrderId = String(
                  paypalCreateResp?.paypal_order?.id ||
                    paypalCreateResp?.paypalOrder?.id ||
                    paypalCreateResp?.paypalOrderId ||
                    "",
                ).trim();

                if (!paypalOrderId) {
                  const err = {
                    status: paypalCreateRes.status || 500,
                    code: "missing_paypal_order_id",
                    message:
                      "PayPal order was created but no PayPal order id was returned.",
                    detail: paypalCreateResp,
                  };

                  onFailed?.(err);
                  throw makeAbortError(err.code, err);
                }

                checkoutSessionRef.current =
                  paypalCreateResp?.checkout_session ||
                  paypalCreateResp?.checkoutSession ||
                  checkoutSession;

                return paypalOrderId;
              } finally {
                creatingRef.current = false;
              }
            }}
            onApprove={async (data) => {
              if (approvingRef.current) return;
              approvingRef.current = true;

              try {
                const paypalOrderId = String(data?.orderID || "").trim();

                if (!paypalOrderId) {
                  const err = {
                    status: 400,
                    code: "missing_paypal_order_id",
                    message: "Missing PayPal order id after approval.",
                    detail: { data },
                  };

                  onFailed?.(err);
                  approvingRef.current = false;
                  return;
                }

                const sessionToken = String(
                  checkoutSessionTokenRef.current || "",
                ).trim();

                if (!sessionToken) {
                  const err = {
                    status: 400,
                    code: "missing_checkout_session_token",
                    message:
                      "Missing checkout session token before PayPal capture.",
                    detail: {
                      data,
                      checkoutSession: checkoutSessionRef.current,
                    },
                  };

                  onFailed?.(err);
                  approvingRef.current = false;
                  return;
                }

                // ✅ 4. 后端 capture PayPal + 后端自动建单
                const { res: captureRes, data: captureResp } = await postJson(
                  `${apiBase}/checkout/sessions/${encodeURIComponent(
                    sessionToken,
                  )}/paypal/capture`,
                  {},
                );

                if (!captureRes.ok || !captureResp?.ok) {
                  const err = makeBackendError(
                    captureRes.status,
                    captureResp,
                    "paypal_capture_failed",
                    "PayPal capture failed.",
                  );

                  onFailed?.(err);
                  approvingRef.current = false;
                  return;
                }

                const createdOrderId =
                  Number(captureResp?.order?.id ?? captureResp?.order_id ?? 0) >
                  0
                    ? Number(captureResp?.order?.id ?? captureResp?.order_id)
                    : null;

                const merged = {
                  provider: "paypal",
                  orderId: paypalOrderId,
                  transactionId:
                    captureResp?.checkout_session?.paypal_capture_id ??
                    captureResp?.checkoutSession?.paypalCaptureId ??
                    captureResp?.paypal_capture_id ??
                    null,
                  raw: captureResp,
                  data,
                  details: captureResp,
                  successMeta,
                  order: captureResp,
                  createdOrderId,
                  checkoutSession:
                    captureResp?.checkout_session ||
                    captureResp?.checkoutSession ||
                    null,
                  checkoutSessionToken: sessionToken,
                  reservationId: reservationIdRef.current,
                };

                void Promise.resolve(onSucceeded?.(merged));

                // ✅ 不在这里跳转，由上层 handlePaySucceeded / PaymentStep 统一处理
                return;
              } catch (e: any) {
                console.error("[paypal] onApprove/capture failed:", e);

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
