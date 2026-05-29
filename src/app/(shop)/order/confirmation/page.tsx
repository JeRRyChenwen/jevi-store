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

export default function OrderConfirmationPage() {
  const sp = useSearchParams();

  const orderId = useMemo(() => {
    const raw = String(sp.get("orderId") || "").trim();
    return raw || null;
  }, [sp]);

  const orderEmail = useMemo(() => {
    const raw =
      sp.get("email") || sp.get("customerEmail") || sp.get("orderEmail") || "";
    const email = String(raw).trim().toLowerCase();
    return email && email.includes("@") ? email : null;
  }, [sp]);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<ServerOrder | null>(null);
  const [items, setItems] = useState<ServerItem[] | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("bag:v1", "[]");
      window.dispatchEvent(
        new CustomEvent("bag:count", { detail: { count: 0 } }),
      );
      window.dispatchEvent(new CustomEvent("bag:updated", { detail: {} }));
    } catch {}
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let timer: any = null;

    const poll = async () => {
      if (cancelled) return;
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
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });

        const data: ServerResp | null = await res.json().catch(() => null);
        if (cancelled) return;

        const normalizedItems = normalizeItems(data);
        const gotOrder = !!(res.ok && data?.ok && data.order);
        const gotItems = !!normalizedItems;

        if (gotOrder && gotItems) {
          setOrder(data!.order!);
          setItems(normalizedItems!);
          setLoading(false);
          return;
        }
      } catch {
        // ignore and keep polling
      }

      if (!cancelled) {
        setLoading(true);
        timer = setTimeout(poll, 500);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, orderEmail]);

  if (!orderId) {
    return (
      <main className="bg-neutral-50/60 px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-semibold mb-2">Missing order id</h1>
          <p className="text-neutral-600 mb-6">
            We couldn’t find an orderId in the URL.
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
