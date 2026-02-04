// src/app/profile/orders/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

// 可以改成你自己的正式域名，比如 https://social-platform.pages.dev
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type OrderItem = {
  id: number;
  product_title: string | null;
  variant_title: string | null;
  qty: number;
  currency: string | null;
  unit_price_minor: number;
  line_total_minor: number;
  height_increase_cm?: number | null;
};

// ✅ 注意：你的 API 现在返回的是 total_minor（不是 grand_total_minor）
// 所以这里把常见字段都兼容进来
type OrderDetail = {
  id: number;
  order_number?: string | null;
  email: string | null;
  status: string | null;
  currency: string | null;

  // ✅ 兼容字段：API 可能叫 total_minor / grand_total_minor
  total_minor?: number | null;
  grand_total_minor?: number | null;

  items_total_minor?: number | null;

  // ✅ 兼容字段：API 可能没给 delivery_fee_minor
  delivery_fee_minor?: number | null;

  discount_minor?: number | null;
  tax_minor?: number | null;

  // 有些实现会把 meta 带回来（如果你后端加了就会有）
  meta?: any;

  created_at_cn?: string | null; // 已格式化好的字符串（若后端有）
  created_at_ts?: number | null; // Unix 秒
};

type OrderDetailResp = {
  ok?: boolean;
  order?: OrderDetail;
  items?: OrderItem[];
  worker_version?: string;
  error?: string;
};

function fmtCurrency(minor: number | null | undefined, ccy: string | null) {
  const code = (ccy || "AUD").toUpperCase();
  const major = ((minor || 0) as number) / 100;
  const num = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${code} ${num}`;
}

/** ✅ 稳定日期：优先用后端给的 created_at_cn，否则把时间戳格式化为 UTC 字符串 */
function fmtDateStable(ts?: number | null, cn?: string | null): string {
  if (typeof cn === "string" && cn.trim()) return cn.trim();
  if (typeof ts === "number") {
    const d = new Date(ts * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
    );
  }
  return "";
}

async function fetchOrderDetail(idOrNo: string): Promise<OrderDetailResp> {
  const url = `${BASE_URL}/api/orders/${encodeURIComponent(idOrNo)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  let data: OrderDetailResp;
  try {
    data = (await res.json()) as OrderDetailResp;
  } catch {
    data = { ok: false, error: `Failed to parse JSON from ${url}` };
  }

  if (!res.ok || data?.error) {
    throw new Error(
      data?.error || `GET ${url} failed: ${res.status} ${res.statusText}`
    );
  }
  return data;
}

// ⬇ App Router: params 是 Promise，需要 await
type PageProps = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const idOrNo = decodeURIComponent(id);

  let data: OrderDetailResp;
  try {
    data = await fetchOrderDetail(idOrNo);
  } catch (e) {
    console.error("[OrderDetailPage] error:", e);
    notFound();
  }

  if (!data.order) notFound();

  const order = data.order!;
  const items = data.items || [];

  const currency = order.currency || (items[0]?.currency ?? "AUD");

  // ✅ items 小计：优先 order.items_total_minor，否则用 items 汇总
  const itemsTotalMinor =
    typeof order.items_total_minor === "number"
      ? order.items_total_minor
      : items.reduce((sum, it) => sum + (it.line_total_minor || 0), 0);

  const discountMinor =
    typeof order.discount_minor === "number" ? order.discount_minor : 0;
  const taxMinor = typeof order.tax_minor === "number" ? order.tax_minor : 0;

  // ✅ 总计：兼容 total_minor / grand_total_minor
  const totalMinorFromOrder =
    (typeof order.grand_total_minor === "number" && order.grand_total_minor) ||
    (typeof order.total_minor === "number" && order.total_minor) ||
    0;

  /**
   * ✅ Delivery fee：三层兜底
   * 1) order.delivery_fee_minor（如果 API 有给）
   * 2) order.meta.__shipping_quote.delivery_fee_minor（如果后端把 meta 带回来了）
   * 3) 推断：total - items - tax + discount
   *    （你这单 tax/discount 为 0，所以 9415 - 8415 = 1000，刚好就是 $10）
   */
  const deliveryFeeMinor =
    (typeof order.delivery_fee_minor === "number" && order.delivery_fee_minor) ||
    (typeof order?.meta?.__shipping_quote?.delivery_fee_minor === "number" &&
      order.meta.__shipping_quote.delivery_fee_minor) ||
    Math.max(
      0,
      (totalMinorFromOrder || 0) - (itemsTotalMinor || 0) - (taxMinor || 0) + (discountMinor || 0)
    );

  // ✅ grandTotal：优先用 totalMinorFromOrder，否则按公式算
  const grandTotalMinor =
    totalMinorFromOrder ||
    Math.max(0, itemsTotalMinor + deliveryFeeMinor + taxMinor - discountMinor);

  // ✅ 稳定的“下单时间”字符串（避免 Hydration mismatch）
  const createdAt = fmtDateStable(order.created_at_ts, order.created_at_cn);

  // 面包屑显示用的编号
  const displayNo = order.order_number || idOrNo;

  return (
    <main className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
      {/* ✅ 面包屑：Home › Profile › My Orders - [订单号] */}
      <nav className="mb-4 text-sm text-neutral-600" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span className="mx-2 text-neutral-400">›</span>
        <Link href="/profile" className="hover:underline">
          Profile
        </Link>
        <span className="mx-2 text-neutral-400">›</span>
        <span className="text-neutral-900">My Orders - {displayNo}</span>
      </nav>

      <h1 className="text-2xl font-semibold mb-4">Order details</h1>

      {/* 基本信息卡片 */}
      <section className="mb-6 rounded-lg border bg-white px-4 py-3 text-sm space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500">Order number</div>
            <div className="font-medium">{displayNo}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-neutral-500">Status</div>
            <div className="font-medium capitalize">{order.status || "-"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div>
            <div className="text-xs text-neutral-500">Placed at</div>
            <div suppressHydrationWarning>{createdAt || "-"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Contact email</div>
            <div>{order.email || "-"}</div>
          </div>
        </div>
      </section>

      {/* 商品明细 */}
      <section className="mb-6 rounded-lg border bg-white px-4 py-3 text-sm">
        <h2 className="font-medium mb-3">Items</h2>

        {items.length === 0 ? (
          <div className="text-neutral-500 text-sm">No items found for this order.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const hNum =
                typeof it.height_increase_cm === "number" ? it.height_increase_cm : null;

              // ✅ 0 / 3 / 5 / 7 全部显示
              const showHeight = typeof hNum === "number" && Number.isFinite(hNum);
              const showMeta = Boolean(it.variant_title) || showHeight;

              return (
                <div
                  key={it.id}
                  className="flex items-start justify-between border-t first:border-t-0 pt-3 first:pt-0"
                >
                  <div className="pr-3">
                    <div className="font-medium">{it.product_title || "Item"}</div>

                    {showMeta ? (
                      <div className="text-xs text-neutral-500">
                        {it.variant_title ? <span>{it.variant_title}</span> : null}

                        {showHeight ? (
                          <>
                            {it.variant_title ? <span className="mx-2">•</span> : null}
                            <span>Height: +{hNum} cm</span>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="text-xs text-neutral-500 mt-1">Qty: {it.qty}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm">
                      {fmtCurrency(it.line_total_minor, it.currency || currency)}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {fmtCurrency(it.unit_price_minor, it.currency || currency)} each
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 小计总计 */}
      <section className="rounded-lg border bg-white px-4 py-3 text-sm space-y-1">
        <h2 className="font-medium mb-2">Summary</h2>

        <div className="flex justify-between">
          <span className="text-neutral-600">Items subtotal</span>
          <span>{fmtCurrency(itemsTotalMinor, currency)}</span>
        </div>

        {/* ✅ 永远显示 Delivery（0 就显示 FREE，更符合电商习惯） */}
        <div className="flex justify-between">
          <span className="text-neutral-600">Delivery</span>
          <span>{deliveryFeeMinor === 0 ? "FREE" : fmtCurrency(deliveryFeeMinor, currency)}</span>
        </div>

        {taxMinor ? (
          <div className="flex justify-between">
            <span className="text-neutral-600">Tax</span>
            <span>{fmtCurrency(taxMinor, currency)}</span>
          </div>
        ) : null}

        {discountMinor ? (
          <div className="flex justify-between text-red-600">
            <span>Discount</span>
            <span>-{fmtCurrency(discountMinor, currency)}</span>
          </div>
        ) : null}

        <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
          <span>Total</span>
          <span>{fmtCurrency(grandTotalMinor, currency)}</span>
        </div>
      </section>
    </main>
  );
}
