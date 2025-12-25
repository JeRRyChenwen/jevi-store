// src/app/returns/page.tsx
"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FilterButton from "@/components/filters/FilterButton";

// ✅ DropdownMenu 由业务页控制（FilterButton 只是按钮）
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ✅ 复用你现有的 Strapi 工具
import { api, mediaUrl } from "@/lib/strapi";

// ✅ 复用统一的 PageBack（你要的 Back）
import PageBack from "@/components/PageBack";

import ReturnItemsSelector, {
  type ReturnOrderDetail,
  type SelectedReturnLine,
} from "./_components/ReturnItemsSelector";

type OrderSummary = {
  id: number;
  order_number?: string | null;
  email: string | null;
  status: string | null;
  currency: string | null;
  grand_total_minor: number;
  created_at_cn?: string | null;
};

// ✅ /api/returns/bootstrap 返回的订单行（来自 /my/orders）
type MyOrderRow = {
  id: number;
  order_number?: string | null;
  email: string | null;
  currency: string | null;
  total_minor: number;
  status: string | null;
  item_count: number;
  created_at_cn?: string | null;
  updated_at_cn?: string | null;
  paid_at_cn?: string | null;
};

type ReturnsBootstrapResp = {
  ok: boolean;
  authed: boolean;
  email: string | null;
  orders: MyOrderRow[];
  error?: string;
  worker_version?: string;
};

type StrapiImage = {
  url?: string | null;
  formats?: { thumbnail?: { url?: string | null } };
};

type StrapiMediaRel =
  | { data?: { attributes?: StrapiImage }[] }
  | { attributes?: StrapiImage }[]
  | StrapiImage[]
  | StrapiImage
  | any;

function firstImageUrlFromRel(rel?: StrapiMediaRel): string | null {
  if (!rel) return null;

  // { data: [{ attributes: { url } }] }
  const data = (rel as any)?.data;
  if (Array.isArray(data) && data.length) {
    const a: StrapiImage | undefined = data[0]?.attributes;
    const raw = a?.formats?.thumbnail?.url || a?.url || null;
    return raw ? mediaUrl(raw) : null;
  }

  // 扁平数组：[{ attributes: { url } }] / [{ url }]
  if (Array.isArray(rel) && rel.length) {
    const a: StrapiImage | undefined = rel[0]?.attributes ?? rel[0];
    const raw = a?.formats?.thumbnail?.url || a?.url || null;
    return raw ? mediaUrl(raw) : null;
  }

  // 单对象：{ url } / { attributes: { url } }
  const a3: StrapiImage | undefined = (rel as any)?.attributes ?? (rel as any);
  const raw = a3?.formats?.thumbnail?.url || a3?.url || null;
  return raw ? mediaUrl(raw) : null;
}

function fmtMoney(minor: number, currency: string | null) {
  const code = (currency || "AUD").toUpperCase();
  const major = (minor || 0) / 100;
  const num = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
  return `${code} ${num}`;
}

// ✅ 用于排序：把 "2025-12-20 18:51:57" 这种 cn 时间转为可比较的时间戳
function toTsFromCn(s?: string | null) {
  if (!s) return 0;
  const x = String(s).trim();
  if (!x) return 0;
  const iso = x.includes(" ") ? x.replace(" ", "T") : x;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export default function ReturnsPage() {
  const search = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [orderNumber, setOrderNumber] = useState(search.get("order") || "");
  const [email, setEmail] = useState(search.get("email") || "");

  // ✅ 登录态引导（bootstrap）
  const [authed, setAuthed] = useState<boolean>(false);
  const [bootLoading, setBootLoading] = useState<boolean>(true);
  const [bootError, setBootError] = useState<string>("");

  const [myOrders, setMyOrders] = useState<MyOrderRow[]>([]);

  // ✅ 排序 state（只在本页面使用）
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc"); // desc=新到旧/大到小

  // ✅ Filter 下拉开关（由业务页控制）
  const [filterOpen, setFilterOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);

  // 查到的订单明细（带 items），用于 ReturnItemsSelector
  const [foundOrder, setFoundOrder] = useState<ReturnOrderDetail | null>(null);

  // ✅ itemId -> thumbnail url
  const [thumbByItemId, setThumbByItemId] = useState<
    Record<number, string | null>
  >({});

  // 用户选择退哪些商品、各退多少
  const [selectedLines, setSelectedLines] = useState<SelectedReturnLine[]>([]);

  const [reasonType, setReasonType] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);


  // ✅ 把后端 error code 转成用户可读文案
  const displayError = useMemo(() => {
    if (!error) return "";
    if (error === "duplicate_return_request") {
      return (
        "You have already submitted a return request for this item. " +
        "Please wait for our team to review your existing request instead of submitting another one."
      );
    }
    return error;
  }, [error]);

  const isDuplicateError = error === "duplicate_return_request";

  // ✅ 页面加载时：调用 bootstrap，决定“登录用户/游客”模式
  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        setBootLoading(true);
        setBootError("");

        const res = await fetch("/api/returns/bootstrap?limit=50&offset=0", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as ReturnsBootstrapResp;

        console.log("[returns] bootstrap status:", res.status);
        console.log("[returns] bootstrap data:", data);
        console.log(
          "[returns] orders length:",
          Array.isArray(data?.orders) ? data.orders.length : "not-array"
        );

        // 即使 ok=false，也要允许前端降级为游客模式
        if (!data?.ok) {
          if (!dead) {
            setAuthed(false);
            setMyOrders([]);
            setBootError(data?.error || "Failed to load your orders.");
          }
          return;
        }

        if (!dead) {
          setAuthed(!!data.authed);
          setMyOrders(Array.isArray(data.orders) ? data.orders : []);
          // ✅ 不再把登录邮箱写入 email 输入框 state
        }
      } catch (e: any) {
        if (!dead) {
          setAuthed(false);
          setMyOrders([]);
          setBootError(String(e?.message || e || "Failed to load your orders."));
        }
      } finally {
        if (!dead) setBootLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, []);

  // ✅ myOrders -> 排序后的数组
  const filteredMyOrders = useMemo(() => {
    const arr = Array.isArray(myOrders) ? [...myOrders] : [];
    const dir = sortDir === "asc" ? 1 : -1;

    arr.sort((a, b) => {
      if (sortBy === "amount") {
        const av = Number(a.total_minor || 0);
        const bv = Number(b.total_minor || 0);
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      }

      // sortBy === "date"
      const at = toTsFromCn(a.paid_at_cn || a.created_at_cn);
      const bt = toTsFromCn(b.paid_at_cn || b.created_at_cn);
      if (at === bt) return 0;
      return at > bt ? dir : -dir;
    });

    return arr;
  }, [myOrders, sortBy, sortDir]);

  const badgeText = useMemo(() => {
    return sortBy === "date"
      ? `Date · ${sortDir === "desc" ? "New → Old" : "Old → New"}`
      : `Amount · ${sortDir === "desc" ? "High → Low" : "Low → High"}`;
  }, [sortBy, sortDir]);

  // Step 1: 根据 orderNumber + email 查询订单
  async function handleFindOrder(nextOrderNumber?: string, nextEmail?: string) {
    setError(null);

    const on = String(nextOrderNumber ?? orderNumber ?? "").trim();
    const em = String(nextEmail ?? email ?? "").trim().toLowerCase();

    if (!on || !em) {
      setError("Please enter both order number and email.");
      return;
    }

    // 同步回 state（确保后续 submit 用到一致的 email/orderNumber）
    setOrderNumber(on);
    setEmail(em);

    try {
      setLoading(true);

      const res = await fetch(
        `/api/returns/lookup?order_number=${encodeURIComponent(on)}&email=${encodeURIComponent(
          em
        )}`,
        { credentials: "include" }
      );

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to find order.");
        return;
      }

      // 简要信息
      setOrder(data.order);

      // 明细信息（带 items）给 ReturnItemsSelector 使用
      const nextFoundOrder: ReturnOrderDetail = {
        ...(data.order || {}),
        items: data.items || [],
      };
      setFoundOrder(nextFoundOrder);

      // ✅ DEBUG
      console.log(
        "[returns] first item keys:",
        Object.keys((nextFoundOrder.items?.[0] ?? {}) as any)
      );
      console.log("[returns] sample item:", nextFoundOrder.items?.[0]);

      // 重置已选商品
      setSelectedLines([]);

      // ✅ 先清空缩略图映射，再批量从 Strapi 补图
      setThumbByItemId({});

      // ✅ 批量拉图（方案B）：用 product_title 去 Strapi 查 Product.title
      try {
        const items = Array.isArray(nextFoundOrder.items) ? nextFoundOrder.items : [];

        // 1) 收集 title（订单返回的是 product_title）
        const titles = Array.from(
          new Set(
            items
              .map((it: any) => String(it?.product_title || "").trim())
              .filter((s: string) => !!s)
          )
        );

        if (titles.length > 0) {
          // 2) Strapi v5：filters[$or][i][title][$eqi]=xxx
          const p = new URLSearchParams();
          titles.forEach((t, i) => {
            p.append(`filters[$or][${i}][title][$eqi]`, t);
          });

          // 只取最小字段 + 正确的嵌套 populate
          p.append("fields[0]", "title");
          p.append("fields[1]", "slug");
          p.append("publicationState", "live");
          p.append("populate[color_galleries][populate][images]", "true");

          const qs = `/api/products?${p.toString()}`;

          console.log("[returns] products query:", qs);

          const strapiRes: any = await api(qs, { noCache: true });
          const products: any[] = strapiRes?.data ?? [];

          console.log("[returns] products matched:", products.length);
          console.log("[returns] first product row:", products?.[0]);

          // 3) title -> { def, colors }
          const productIndex: Record<
            string,
            { def: string | null; colors: Record<string, string> }
          > = {};

          for (const row of products) {
            const attrs = row?.attributes ?? row; // 兼容
            const title = String(attrs?.title ?? "").trim();
            if (!title) continue;

            // 兼容：字段名不小心写成 color_gallery / color_galleries 的情况
            const galleries = Array.isArray(attrs?.color_galleries)
              ? attrs.color_galleries
              : Array.isArray(attrs?.color_gallery)
              ? attrs.color_gallery
              : [];

            const colors: Record<string, string> = {};
            let def: string | null = null;

            for (const g of galleries) {
              const c = String(g?.color ?? "").trim().toLowerCase();
              const u = firstImageUrlFromRel(g?.images as any);

              if (!def && u) def = u;
              if (c && u) colors[c] = u;
            }

            if (!def) {
              for (const g of galleries) {
                const u = firstImageUrlFromRel(g?.images as any);
                if (u) {
                  def = u;
                  break;
                }
              }
            }

            productIndex[title.toLowerCase()] = { def, colors };
          }

          // 4) itemId -> thumbUrl
          const nextThumb: Record<number, string | null> = {};
          for (const it of items as any[]) {
            const itemId = Number(it?.id);
            if (!Number.isFinite(itemId) || itemId <= 0) continue;

            const t = String(it?.product_title || "").trim().toLowerCase();
            const idx = t ? productIndex[t] : null;

            // 你的 variant_title 是 "color / size"，颜色取 "/" 前
            const rawVariant = String(it?.variant_title ?? "");
            const color = rawVariant.split("/")[0]?.trim().toLowerCase();

            nextThumb[itemId] =
              color && idx?.colors?.[color] ? idx.colors[color] : idx?.def ?? null;
          }

          console.log("[returns] nextThumb:", nextThumb);
          setThumbByItemId(nextThumb);
        }
      } catch (e) {
        console.error("[returns] fetch strapi thumbs failed:", e);
      }

      // ✅ 每次进入 Step 2 之前，把原因表单清空
      setReasonType("");
      setReasonDetail("");

      setStep(2);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: 提交退货
  async function handleSubmitReturn() {
    setError(null);
    if (!order) {
      setError("No order loaded.");
      return;
    }

    const lines = selectedLines.filter((l) => l.qty > 0);
    if (!lines.length) {
      setError("Please choose at least one item to return.");
      return;
    }
    if (!reasonType.trim()) {
      setError("Please choose a return reason.");
      return;
    }

    const selectedItems = lines.map((l) => ({
      order_item_id: l.item_id,
      qty: l.qty,
    }));

    try {
      setSubmitting(true);
      const res = await fetch("/api/returns", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order_number: order.order_number || order.id,
          reason_type: reasonType,
          reason_detail: reasonDetail,
          items: selectedItems,
          email: email.trim().toLowerCase(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const errCode = String(data.error || "");
        // ✅ 特判重复提交：只标记错误码，后面在按钮下方展示文案
        if (res.status === 409 || errCode === "duplicate_return_request") {
          setError("duplicate_return_request");
        } else {
          setError(errCode || "Failed to submit return.");
        }
        return;
      }

      setSubmitResult(data);
      setStep(3);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-3">
        <PageBack />
      </div>

      <h1 className="text-2xl font-semibold mb-4">Returns &amp; Exchanges</h1>

      {displayError && !isDuplicateError && (
        <div className="mb-4 text-sm text-red-600">{displayError}</div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {bootLoading ? (
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">
                Loading your orders…
              </div>
            </Card>
          ) : authed ? (
            <Card className="p-4 space-y-6">
              {/* ===== 登录态：订单列表 ===== */}
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Your orders</div>
                  <div className="text-xs text-muted-foreground">
                    Select an order to start a return.
                  </div>
                </div>

                {bootError && (
                  <div className="text-sm text-red-600">{bootError}</div>
                )}

                <div className="flex items-center justify-end">
                  <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
                    <DropdownMenuTrigger asChild>
                      <div>
                        <FilterButton
                          label="Filter"
                          active={true}
                          badgeText={badgeText}
                        />
                      </div>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="p-4 bg-white border rounded-md shadow-md z-50"
                      style={{ width: 360 }}
                    >
                      <div className="space-y-3">
                        <div className="text-sm font-medium">Sort orders</div>

                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Sort by
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className={
                                sortBy === "date"
                                  ? "border-2 border-black text-black bg-muted"
                                  : "border"
                              }
                              onClick={() => setSortBy("date")}
                            >
                              Date
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              className={
                                sortBy === "amount"
                                  ? "border-2 border-black text-black bg-muted"
                                  : "border"
                              }
                              onClick={() => setSortBy("amount")}
                            >
                              Amount
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Order
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className={
                                sortDir === "desc"
                                  ? "border-2 border-black text-black bg-muted"
                                  : "border"
                              }
                              onClick={() => setSortDir("desc")}
                            >
                              {sortBy === "date" ? "New → Old" : "High → Low"}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              className={
                                sortDir === "asc"
                                  ? "border-2 border-black text-black bg-muted"
                                  : "border"
                              }
                              onClick={() => setSortDir("asc")}
                            >
                              {sortBy === "date" ? "Old → New" : "Low → High"}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="px-6"
                            onClick={() => {
                              setSortBy("date");
                              setSortDir("desc");
                            }}
                          >
                            Clear
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="px-6"
                            onClick={() => setFilterOpen(false)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {filteredMyOrders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No orders found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="text-left text-neutral-500">
                        <tr>
                          <th className="py-2 pl-3 pr-4">Order</th>
                          <th className="py-2 pr-4">Paid at</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMyOrders.map((o) => (
                          <tr key={o.id} className="border-t">
                            <td className="py-2 pl-3 pr-4 font-medium">
                              {o.order_number || `#${o.id}`}
                              <div className="text-xs text-muted-foreground">
                                Items: {o.item_count}
                              </div>
                            </td>
                            <td className="py-2 pr-4">
                              {o.paid_at_cn || o.created_at_cn || "-"}
                            </td>
                            <td className="py-2 pr-4">
                              {fmtMoney(o.total_minor, o.currency)}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">
                              {o.status || "-"}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              <Button
                                variant="outline"
                                className="px-4"
                                disabled={loading || !o.order_number || !o.email}
                                onClick={() =>
                                  handleFindOrder(
                                    String(o.order_number || ""),
                                    String(o.email || "")
                                  )
                                }
                              >
                                {loading ? "Loading…" : "Start Return"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ===== 新增：把“订单号 + 邮箱查单”直接放在下方（不再跳转） ===== */}
              <div className="border-t pt-6 space-y-4">
                <div>
                  <div className="text-sm font-medium">
                    Find an order by order number and email
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Use this if you want to start a return for a different email/order.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Order number</label>
                  <Input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. SP20251201-000123"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Email used for this order
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                  />
                </div>

                <Button
                  variant="outline"
                  className="px-6"
                  onClick={() => handleFindOrder()}
                  disabled={loading}
                >
                  {loading ? "Finding your order..." : "Find my order"}
                </Button>
              </div>
            </Card>
          ) : (
            // ✅ 游客：保留原输入框
            <Card className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Please enter your order number and email to start a return.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Order number</label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. SP20251201-000123"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Email used for this order
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                className="px-6"
                onClick={() => handleFindOrder()}
                disabled={loading}
              >
                {loading ? "Finding your order..." : "Find my order"}
              </Button>
            </Card>
          )}
        </div>
      )}

      {step === 2 && order && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex justify-between text-sm">
              <div>
                <div className="font-medium">
                  Order {order.order_number ?? order.id}
                </div>
                <div className="text-muted-foreground">
                  Placed at: {order.created_at_cn || "N/A"}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                Status: {order.status}
              </div>
            </div>
          </Card>

          {foundOrder && (
            <ReturnItemsSelector
              order={foundOrder}
              onSelectionChange={setSelectedLines}
              thumbByItemId={thumbByItemId}
            />
          )}

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Return reason</h2>
            <div className="space-y-2">
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
              >
                <option value="">Select a reason</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="wrong_item">Received wrong item</option>
                <option value="faulty">Faulty / damaged</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Details (optional)</label>
              <textarea
                rows={4}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="Tell us more..."
                value={reasonDetail}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setReasonDetail(e.target.value)
                }
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                className="px-6"
                onClick={handleSubmitReturn}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit return request"}
              </Button>
            </div>

            {isDuplicateError && (
              <div className="mt-6">
                <div className="border border-red-400/70 bg-red-50 text-red-700 rounded-md px-4 py-3 text-sm">
                  <div className="font-semibold">
                    Return request already submitted
                  </div>
                  <div className="mt-1 text-xs leading-relaxed">
                    It looks like you&apos;ve already submitted a return request for this
                    item or your return request contains items that you've already submitted. Please wait for our team to review your existing request and
                    contact you via email before submitting another one.
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {step === 3 && submitResult && (
        <Card className="p-4 space-y-3 mt-4">
          <h2 className="text-lg font-semibold">Return request submitted 🎉</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve received your return request. You&apos;ll receive an email
            once it&apos;s reviewed.
          </p>
          <div className="text-sm">
            <div>
              Return ID:{" "}
              <span className="font-mono">
                {submitResult.return?.return_number ?? submitResult.return?.id}
              </span>
            </div>
            <div>
              Status: <span>{submitResult.return?.status || "pending"}</span>
            </div>
            <div>Created at: {submitResult.return?.created_at_cn || "N/A"}</div>
          </div>
          <Button
            variant="outline"
            className="px-6"
            onClick={() => {
              setStep(1);
              setOrder(null);
              setFoundOrder(null);
              setSelectedLines([]);
              setSubmitResult(null);
              setThumbByItemId({});

              // ✅ 同时把原因相关的 state 清空
              setReasonType("");
              setReasonDetail("");
            }}
          >
            Start another return
          </Button>
        </Card>
      )}

      
    </div>
  );
}
