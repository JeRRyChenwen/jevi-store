// src/app/returns/page.tsx
"use client";

import { useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  // { data: [{ attributes: { url } }]}
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

export default function ReturnsPage() {
  const search = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [orderNumber, setOrderNumber] = useState(search.get("order") || "");
  const [email, setEmail] = useState(search.get("email") || "");

  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderSummary | null>(null);

  // 查到的订单明细（带 items），用于 ReturnItemsSelector
  const [foundOrder, setFoundOrder] = useState<ReturnOrderDetail | null>(null);

  // ✅ itemId -> thumbnail url
  const [thumbByItemId, setThumbByItemId] = useState<Record<number, string | null>>(
    {}
  );

  // 用户选择退哪些商品、各退多少
  const [selectedLines, setSelectedLines] = useState<SelectedReturnLine[]>([]);

  const [reasonType, setReasonType] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: 根据 orderNumber + email 查询订单
  async function handleFindOrder() {
    setError(null);
    if (!orderNumber.trim() || !email.trim()) {
      setError("Please enter both order number and email.");
      return;
    }
    try {
      setLoading(true);

      const res = await fetch(
        `/api/orders/lookup?order_number=${encodeURIComponent(
          orderNumber.trim()
        )}&email=${encodeURIComponent(email.trim().toLowerCase())}`,
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

      // ✅ DEBUG：立刻看看 lookup 返回的 item 结构里到底有什么字段
      console.log(
        "[returns] first item keys:",
        Object.keys((nextFoundOrder.items?.[0] ?? {}) as any)
      );
      console.log("[returns] sample item:", nextFoundOrder.items?.[0]);

      // 重置已选商品（组件在 order 变化时会自己初始化）
      setSelectedLines([]);

      // ✅ 先清空缩略图映射，再批量从 Strapi 补图
      setThumbByItemId({});

      // ✅ 批量拉图（方案B）：用 product_title（订单里稳定有）去 Strapi 查 Product.title
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

          // 只取最小字段 + 正确的嵌套 populate（仿照你的 search bar）
          p.append("fields[0]", "title");
          p.append("fields[1]", "slug");
          p.append("publicationState", "live");
          p.append("populate[color_galleries][populate][images]", "true");

          const qs = `/api/products?${p.toString()}`;

          console.log("[returns] products query:", qs);

          const strapiRes: any = await api(qs, { noCache: true });
          const products: any[] = strapiRes?.data ?? [];

          console.log("[returns] products matched:", products.length);

          // ✅ 临时再加一个：看看 products[0] 的真实结构（你排查完可以删）
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

            // ✅ 关键改动：不再写死 g.images.data[0]，而是用兼容解析
            for (const g of galleries) {
              const c = String(g?.color ?? "").trim().toLowerCase();
              const u = firstImageUrlFromRel(g?.images as any);

              if (!def && u) def = u; // 第一个可用图作为默认
              if (c && u) colors[c] = u;
            }

            // 如果 galleries 循环里没拿到 def，再兜底扫一次
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
              (color && idx?.colors?.[color]) ? idx.colors[color] : (idx?.def ?? null);
          }

          console.log("[returns] nextThumb:", nextThumb);
          setThumbByItemId(nextThumb);
        }
      } catch (e) {
        console.error("[returns] fetch strapi thumbs failed:", e);
      }

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

    // 过滤出 qty > 0 的行
    const lines = selectedLines.filter((l) => l.qty > 0);
    if (!lines.length) {
      setError("Please choose at least one item to return.");
      return;
    }
    if (!reasonType.trim()) {
      setError("Please choose a return reason.");
      return;
    }

    // API 期望的结构：{ order_item_id, qty }
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
        setError(data.error || "Failed to submit return.");
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
      {/* ✅ 新增：复用 PageBack，并放在标题正上方（不是面包屑下面） */}
      <div className="mb-3">
        <PageBack />
      </div>

      <h1 className="text-2xl font-semibold mb-4">
        Returns &amp; Exchanges
      </h1>

      {error && (
        <div className="mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <Card className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Please enter your order number and email to
            start a return.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Order number
            </label>
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

          <Button variant="outline" className="px-6" onClick={handleFindOrder} disabled={loading}>
            {loading ? "Finding your order..." : "Find my order"}
          </Button>
        </Card>
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

          {/* 商品选择区域：由 ReturnItemsSelector 负责渲染 */}
          {foundOrder && (
            <ReturnItemsSelector
              order={foundOrder}
              onSelectionChange={setSelectedLines}
              thumbByItemId={thumbByItemId}
            />
          )}

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">
              Return reason
            </h2>
            <div className="space-y-2">
              <select
                className="w-full border rounded px-2 py-1 text-sm"
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value)}
              >
                <option value="">Select a reason</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="wrong_item">
                  Received wrong item
                </option>
                <option value="faulty">Faulty / damaged</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Details (optional)
              </label>
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

            {/* ✅ 改动：移除这里的旧 Back（避免重复），只保留右侧 Submit */}
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
          </Card>
        </div>
      )}

      {step === 3 && submitResult && (
        <Card className="p-4 space-y-3 mt-4">
          <h2 className="text-lg font-semibold">
            Return request submitted 🎉
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve received your return request.
            You&apos;ll receive an email once it&apos;s
            reviewed.
          </p>
          <div className="text-sm">
            <div>
              Return ID:{" "}
              <span className="font-mono">
                {submitResult.return?.return_number ?? submitResult.return?.id}
              </span>
            </div>
            <div>
              Status:{" "}
              <span>
                {submitResult.return?.status || "pending"}
              </span>
            </div>
            <div>
              Created at:{" "}
              {submitResult.return?.created_at_cn || "N/A"}
            </div>
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
            }}
          >
            Start another return
          </Button>
        </Card>
      )}
    </div>
  );
}
