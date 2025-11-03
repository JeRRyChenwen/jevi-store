// src/app/profile/EditOrdersCard.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Loader2 } from "lucide-react";

/** 把“分”为单位的金额转成货币 */
function fmtMinor(minor: number, currency = "AUD", locale?: string) {
  const value = (Number(minor) || 0) / 100;
  return new Intl.NumberFormat(locale ?? undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

type Order = {
  id: number;
  status?: string | null;
  currency?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  addr_line1?: string | null;
  addr_line2?: string | null;
  addr_city?: string | null;
  addr_state?: string | null;
  addr_postcode?: string | null;
  addr_country?: string | null;

  items_total_minor?: number | null;
  delivery_fee_minor?: number | null;
  discount_minor?: number | null;
  tax_minor?: number | null;
  grand_total_minor?: number | null;

  created_at?: string | null;   // 你的 Worker 里是字符串（北京时间）
  updated_at?: string | null;
  paid_at?: string | null;
};

type OrderItem = {
  id?: number;
  product_id?: number | null;
  product_title?: string | null;
  variant_title?: string | null;
  qty?: number | null;
  currency?: string | null;
  unit_price_minor?: number | null;
  line_total_minor?: number | null;
  discount_minor?: number | null;
  tax_minor?: number | null;
};

type OrderPayment = {
  id?: number;
  provider?: string | null;         // "paypal"/"stripe" 等
  provider_txn_id?: string | null;
  amount_minor?: number | null;
  currency?: string | null;
  status?: string | null;           // "captured" 等
  created_at?: string | null;
  captured_at?: string | null;
};

type OrdersGetResp = {
  ok: boolean;
  order: Order;
  items: OrderItem[];
  payments: OrderPayment[];
  worker_version?: string;
};

export default function EditOrdersCard() {
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<OrdersGetResp | null>(null);

  const currency = data?.order?.currency || "AUD";

  const onSearch = useCallback(async () => {
    setErr(null);
    setData(null);

    const id = String(query || "").trim();
    if (!/^\d+$/.test(id)) {
      setErr("Please enter a valid order number (numbers only).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "GET",
        headers: { accept: "application/json" },
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 404) {
          setErr("Order not found.");
        } else {
          const t = await res.text().catch(() => "");
          setErr(`Failed to load order. (${res.status}) ${t || ""}`);
        }
        return;
      }
      const json = (await res.json()) as OrdersGetResp;
      if (!json?.ok) {
        setErr("Order not found.");
      } else {
        setData(json);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const totals = useMemo(() => {
    const o = data?.order;
    return {
      items: o?.items_total_minor ?? 0,
      delivery: o?.delivery_fee_minor ?? 0,
      discount: o?.discount_minor ?? 0,
      tax: o?.tax_minor ?? 0,
      grand: o?.grand_total_minor ?? 0,
    };
  }, [data]);

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* 搜索区 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <label className="block text-sm text-neutral-600 mb-1">Order Number</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 1024"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
        </div>
        <Button
          onClick={onSearch}
          className="rounded-full"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* 提示/错误 */}
      {err && (
        <div className="text-sm text-red-600">{err}</div>
      )}

      {/* 空态 */}
      {!err && !data && (
        <p className="text-sm text-neutral-600 mt-4">You have placed no orders.</p>
      )}

      {/* 订单概览 */}
      {data && (
        <div className="space-y-6">
          {/* 概览头 */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600">Order</div>
              <div className="text-xs text-neutral-500">#{data.order.id}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1">
                <Check className="h-4 w-4" />
                {data.order.status || "paid"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                {fmtMinor(totals.grand, currency)}
              </span>
              {data.order.paid_at && (
                <span className="text-neutral-500">Paid at {data.order.paid_at}</span>
              )}
            </div>
          </div>

          {/* 收货信息 */}
          <div className="rounded-lg border p-4">
            <div className="text-sm text-neutral-600 mb-1">Shipping Address</div>
            <div className="text-sm">
              {[data.order.first_name, data.order.last_name].filter(Boolean).join(" ") || "—"}
              <br />
              {[
                data.order.addr_line1,
                data.order.addr_line2,
                [data.order.addr_city, data.order.addr_state].filter(Boolean).join(" "),
                [data.order.addr_postcode, data.order.addr_country].filter(Boolean).join(" "),
              ]
                .filter(Boolean)
                .join(", ") || "—"}
              <br />
              {data.order.phone || "—"}
            </div>
          </div>

          {/* 明细 */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="text-sm font-medium">Items</div>
            <div className="space-y-2">
              {data.items?.length ? (
                data.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {it.product_title || "Item"}
                        {it.variant_title ? ` · ${it.variant_title}` : ""}
                      </div>
                      <div className="text-neutral-500">
                        Qty {it.qty ?? 1}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {fmtMinor(it.line_total_minor ?? 0, it.currency || currency)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No items.</div>
              )}
            </div>

            <div className="h-px bg-neutral-200 my-2" />

            {/* totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span>{fmtMinor(totals.items, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Delivery</span>
                <span>{fmtMinor(totals.delivery, currency)}</span>
              </div>
              {!!totals.discount && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Discount</span>
                  <span>-{fmtMinor(Math.abs(totals.discount), currency)}</span>
                </div>
              )}
              {!!totals.tax && (
                <div className="flex justify-between">
                  <span className="text-neutral-600">Tax</span>
                  <span>{fmtMinor(totals.tax, currency)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-1">
                <span>Total</span>
                <span>{fmtMinor(totals.grand, currency)}</span>
              </div>
            </div>
          </div>

          {/* 支付记录 */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-sm font-medium">Payments</div>
            {data.payments?.length ? (
              <div className="space-y-2 text-sm">
                {data.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="text-neutral-600">
                      {(p.provider || "provider").toUpperCase()} · {p.status || "captured"}
                      {p.captured_at ? ` · ${p.captured_at}` : ""}
                    </div>
                    <div className="font-medium">
                      {fmtMinor(p.amount_minor ?? 0, p.currency || currency)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No payment records.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
