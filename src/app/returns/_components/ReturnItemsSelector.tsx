// src/app/returns/_components/ReturnItemsSelector.tsx
"use client";

import * as React from "react";

export type ReturnOrderItem = {
  id: number;
  product_title: string | null;
  variant_title: string | null;
  qty: number;                 // 该商品在原订单里的购买数量
  currency: string | null;
  unit_price_minor: number;    // 单价（分）
  line_total_minor: number;    // 小计（分）
};

export type ReturnOrderDetail = {
  id: number;
  order_number?: string | null;
  currency: string | null;
  items: ReturnOrderItem[];
};

export type SelectedReturnLine = {
  item_id: number;
  qty: number;                 // 用户选择退的数量
};

export function formatMoney(minor: number, currency: string | null | undefined) {
  const cur = currency || "AUD";
  const major = (minor || 0) / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}

function parseVariantTitle(variantTitle?: string | null) {
  const raw = String(variantTitle ?? "").trim();
  if (!raw) {
    return { color: null as string | null, size: null as string | null, raw: "" };
  }

  // 兼容 "color / size"
  const parts = raw
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      color: parts[0] ?? null,
      size: parts[1] ?? null,
      raw,
    };
  }

  // 只有一个字段，不强行判断是颜色还是尺码，留给兜底显示 raw
  return { color: null, size: null, raw };
}

export default function ReturnItemsSelector({
  order,
  onSelectionChange,
  thumbByItemId,
}: {
  order: ReturnOrderDetail;
  onSelectionChange?: (lines: SelectedReturnLine[]) => void;
  thumbByItemId?: Record<number, string | null>;
}) {
  const [selected, setSelected] = React.useState<Record<number, number>>({});

  // 初始化：默认全选、数量 = 购买数量
  React.useEffect(() => {
    if (!order || !order.items) return;
    const next: Record<number, number> = {};
    for (const it of order.items) {
      if (!it || typeof it.id !== "number") continue;
      next[it.id] = it.qty || 1;
    }
    setSelected(next);
  }, [order]);

  // 把内部 state 映射成数组给外层
  React.useEffect(() => {
    if (!onSelectionChange) return;
    const lines: SelectedReturnLine[] = Object.entries(selected)
      .map(([idStr, qty]) => ({
        item_id: Number(idStr),
        qty,
      }))
      .filter((l) => l.qty > 0);
    onSelectionChange(lines);
  }, [selected, onSelectionChange]);

  const toggleItem = (itemId: number, checked: boolean, maxQty: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (!checked) {
        delete next[itemId];
      } else {
        if (!next[itemId] || next[itemId] <= 0) {
          next[itemId] = Math.max(1, Math.min(maxQty, 1));
        }
      }
      return next;
    });
  };

  const changeQty = (itemId: number, value: string, maxQty: number) => {
    const n = Number(value.replace(/[^\d]/g, ""));
    if (!Number.isFinite(n)) return;
    const clamped = Math.max(1, Math.min(maxQty, n || 1));
    setSelected((prev) => ({
      ...prev,
      [itemId]: clamped,
    }));
  };

  if (!order || !order.items || order.items.length === 0) {
    return null;
  }

  const currency = order.currency || order.items[0]?.currency || "AUD";

  return (
    <section className="mt-6 border border-neutral-200 rounded-2xl p-4 md:p-6 bg-white">
      <h2 className="text-lg font-semibold mb-4">
        Select items to return
      </h2>

      <div className="space-y-4">
        {order.items.map((item) => {
          const itemId = item.id;
          const maxQty = item.qty || 1;
          const checked = selected[itemId] != null;
          const selectedQty = selected[itemId] || 0;

          return (
            <div
              key={itemId}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b last:border-b-0 pb-4 last:pb-0"
            >
              <div className="flex items-start gap-3">
                {/* ✅ thumbnail */}
                <div className="w-25 h-30 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 shrink-0 flex items-center justify-center">
                  {thumbByItemId?.[itemId] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbByItemId[itemId] as string}
                      alt={item.product_title || "Item"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-[10px] text-neutral-400">No image</div>
                  )}
                </div>

                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                  checked={checked}
                  onChange={(e) =>
                    toggleItem(itemId, e.target.checked, maxQty)
                  }
                />
                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    {item.product_title || "Item"}
                  </div>

                  {(() => {
                    const { color, size, raw } = parseVariantTitle(item.variant_title);

                    return (
                      <>
                        {color && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Color:{" "}
                            <span className="text-neutral-900 font-medium">
                              {color}
                            </span>
                          </div>
                        )}

                        {size && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Size:{" "}
                            <span className="text-neutral-900 font-medium">
                              {size}
                            </span>
                          </div>
                        )}

                        {!color && !size && raw && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {raw}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="mt-1 text-xs text-neutral-500">
                    Ordered qty: {maxQty}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Unit price:{" "}
                    {formatMoney(item.unit_price_minor, currency)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Line total:{" "}
                    {formatMoney(item.line_total_minor, currency)}
                  </div>
                </div>
              </div>

              {/* 数量选择区域 */}
              {checked && (
                <div className="flex items-center gap-2 md:min-w-[180px]">
                  <label className="text-xs text-neutral-600">
                    Qty to return
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={selectedQty}
                    onChange={(e) =>
                      changeQty(itemId, e.target.value, maxQty)
                    }
                    className="w-20 rounded-full border border-neutral-300 px-3 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  <span className="text-xs text-neutral-500">
                    / {maxQty}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
