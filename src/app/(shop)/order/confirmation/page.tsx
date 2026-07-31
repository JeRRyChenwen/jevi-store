// src/app/(shop)/order/confirmation/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ServerItem, ServerOrder, ServerResp } from "./types";
import { deriveMoney, normalizeAddress, normalizeItems } from "./utils";
import FinalizingView from "./_components/FinalizingView";
import ConfirmationItemsSection from "./_components/ConfirmationItemsSection";
import ConfirmationSidebar from "./_components/ConfirmationSidebar";

type LastOrderPreview = {
  orderId?: number | string | null;
  orderNumber?: string | null;

  address?: {
    email?: unknown;
    [key: string]: unknown;
  } | null;

  payload?: any;
};

function normalizeOrderKey(value: unknown): string | null {
  const normalized = String(value ?? "").trim();

  return normalized || null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return normalized && normalized.includes("@") ? normalized : null;
}

function readLastOrderPreview(): LastOrderPreview | null {
  try {
    const raw = window.sessionStorage.getItem("last-order-preview");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object"
      ? (parsed as LastOrderPreview)
      : null;
  } catch {
    return null;
  }
}

function extractPreviewEmail(preview: LastOrderPreview | null): string | null {
  if (!preview) {
    return null;
  }

  const payment = preview.payload?.payment ?? null;

  const candidates = [
    preview.address?.email,

    payment?.successMeta?.checkoutEmail,
    payment?.successMeta?.accountEmail,
    payment?.successMeta?.email,
    payment?.successMeta?.address?.email,

    payment?.raw?.checkout_session?.email,
    payment?.raw?.checkoutSession?.email,

    payment?.data?.checkout_session?.email,
    payment?.data?.checkoutSession?.email,

    payment?.raw?.order?.order?.email,
    payment?.raw?.order?.email,

    payment?.data?.order?.order?.email,
    payment?.data?.order?.email,
  ];

  for (const candidate of candidates) {
    const email = normalizeEmail(candidate);

    if (email) {
      return email;
    }
  }

  return null;
}

export default function OrderConfirmationPage() {
  const sp = useSearchParams();

  const urlOrderId = useMemo(() => {
    return normalizeOrderKey(sp.get("orderId"));
  }, [sp]);

  const urlOrderEmail = useMemo(() => {
    return normalizeEmail(
      sp.get("email") || sp.get("customerEmail") || sp.get("orderEmail"),
    );
  }, [sp]);

  const [previewResolved, setPreviewResolved] = useState(false);

  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  const [previewOrderEmail, setPreviewOrderEmail] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [order, setOrder] = useState<ServerOrder | null>(null);

  const [items, setItems] = useState<ServerItem[] | null>(null);

  /**
   * 从本次成功结账保存的 last-order-preview 中恢复订单信息。
   *
   * 对于以前生成的带邮箱旧链接，先把 URL 中的邮箱保存到
   * 组件状态，再从浏览器地址栏中移除，避免清理 URL 后
   * 游客订单查询失去邮箱校验信息。
   */
  useEffect(() => {
    const preview = readLastOrderPreview();

    const recoveredOrderId =
      normalizeOrderKey(preview?.orderNumber) ||
      normalizeOrderKey(preview?.orderId);

    const recoveredEmail = urlOrderEmail || extractPreviewEmail(preview);

    setPreviewOrderId(recoveredOrderId);

    setPreviewOrderEmail((current) => {
      return current || recoveredEmail;
    });

    setPreviewResolved(true);
  }, [urlOrderEmail]);

  const orderId = urlOrderId || previewOrderId;

  const orderEmail = urlOrderEmail || previewOrderEmail;

  /**
   * 将确认页 URL 规范化为只包含订单号。
   *
   * 兼容以前生成的带 email、customerEmail 或 orderEmail
   * 参数的旧链接：页面先保存邮箱用于订单查询，
   * 随后立即从浏览器地址栏中移除所有邮箱参数。
   */
  useEffect(() => {
    if (!previewResolved || !orderId) {
      return;
    }

    const params = new URLSearchParams();

    params.set("orderId", orderId);

    const target = `/order/confirmation?${params.toString()}`;

    const current = `${window.location.pathname}${window.location.search}`;

    if (current === target) {
      return;
    }

    try {
      window.history.replaceState(window.history.state, "", target);
    } catch {
      // URL 清理失败不影响订单读取。
    }
  }, [previewResolved, orderId]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      setLoading(true);

      try {
        const apiUrl = new URL(
          `/api/orders/${encodeURIComponent(orderId)}`,
          window.location.origin,
        );

        if (orderEmail) {
          apiUrl.searchParams.set("email", orderEmail);
        }

        const res = await fetch(apiUrl.toString(), {
          method: "GET",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          cache: "no-store",
        });

        const data: ServerResp | null = await res.json().catch(() => null);

        if (cancelled) {
          return;
        }

        const normalizedItems = normalizeItems(data);

        const gotOrder = Boolean(res.ok && data?.ok && data.order);

        const gotItems = Boolean(normalizedItems);

        if (gotOrder && gotItems) {
          setOrder(data!.order!);
          setItems(normalizedItems!);
          setLoading(false);
          return;
        }
      } catch {
        // 订单可能仍在完成写入，继续轮询。
      }

      if (!cancelled) {
        setLoading(true);

        timer = setTimeout(poll, 500);
      }
    };

    void poll();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [orderId, orderEmail]);

  /**
   * 首次客户端挂载时，先等待 sessionStorage
   * 兜底恢复完成，避免短暂显示 Missing order id。
   */
  if (!previewResolved && !urlOrderId) {
    return <FinalizingView />;
  }

  if (!orderId) {
    return (
      <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Missing order id</h1>

          <p className="text-neutral-600 mb-6">
            We couldn’t find a recent order to display.
          </p>

          <Link
            href="/"
            className="rounded-md bg-black text-white px-4 py-2 text-sm font-medium"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (loading || !order || !items) {
    return <FinalizingView />;
  }

  const { currency, totalMinor, shippingMinor } = deriveMoney(order, items);

  const address = normalizeAddress(order);

  const deliveryOption =
    (order.delivery_option ? String(order.delivery_option) : "").trim() ||
    "standard";

  const emailLine = String((order as any)?.email || "").trim();

  return (
    <main className="bg-neutral-50/60 px-3 sm:px-6 lg:px-8 py-6 sm:py-10 overflow-x-hidden">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        <div className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-full border bg-neutral-50 p-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-[20px] leading-tight sm:text-3xl font-semibold tracking-tight">
                Thanks for your order!
              </h1>

              {emailLine ? (
                <p className="mt-2 text-sm leading-6 text-neutral-600 break-words">
                  We’ve emailed your receipt and order details to{" "}
                  <span className="font-medium text-neutral-800 break-all">
                    {emailLine}
                  </span>
                  .
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex max-w-full items-center rounded-full border bg-white px-3 py-1 text-xs text-neutral-700">
                  <span className="shrink-0">Order:</span>

                  <span className="ml-1 font-mono text-neutral-900 break-all">
                    {order.order_number || "Processing"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
          <ConfirmationItemsSection items={items} currency={currency} />

          <ConfirmationSidebar
            order={order}
            items={items}
            currency={currency}
            totalMinor={totalMinor}
            shippingMinor={shippingMinor}
            address={address}
            deliveryOption={deliveryOption}
          />
        </div>
      </div>
    </main>
  );
}
