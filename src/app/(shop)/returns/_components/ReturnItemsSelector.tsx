// src/app/returns/_components/ReturnItemsSelector.tsx
"use client";

import * as React from "react";

export type ReturnOrderItem = {
  id: number;
  product_title: string | null;
  variant_title: string | null;
  qty: number; // 该商品在原订单里的购买数量
  currency: string | null;
  unit_price_minor: number; // 单价（分）
  line_total_minor: number; // 小计（分）
};

export type ReturnOrderDetail = {
  id: number;
  order_number?: string | null;
  currency: string | null;
  items: ReturnOrderItem[];
};

export type SelectedReturnLine = {
  item_id: number;
  qty: number; // 用户选择退的数量
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

/**
 * 解析 variant_title：
 * 兼容两类格式：
 * 1) "color / size"
 * 2) "Color: xxx | Size: yyy | Height: +3 cm | xxx | yyy"
 *
 * 目标：把 color/size/height 抽出来，并避免重复显示（删掉尾部重复的 "xxx | yyy"）
 */
function parseVariantTitle(variantTitle?: string | null) {
  const raw0 = String(variantTitle ?? "").trim();
  if (!raw0) {
    return {
      color: null as string | null,
      size: null as string | null,
      heightCm: null as number | null,
      raw: "",
    };
  }

  // ---------- (A) 新格式：包含 "Color:" / "Size:" / "Height:" ----------
  // 例： "Color: chocolate | Size: 40 | Height: +3 cm | chocolate | 40"
  if (/color\s*:/i.test(raw0) || /size\s*:/i.test(raw0) || /height\s*:/i.test(raw0)) {
    const parts = raw0
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    let color: string | null = null;
    let size: string | null = null;
    let heightCm: number | null = null;

    for (const p of parts) {
      const mColor = p.match(/^color\s*:\s*(.+)$/i);
      if (mColor && mColor[1]) {
        color = mColor[1].trim();
        continue;
      }

      const mSize = p.match(/^size\s*:\s*(.+)$/i);
      if (mSize && mSize[1]) {
        size = mSize[1].trim();
        continue;
      }

      // Height: +3 cm / Height: 3cm / Height: 0 cm
      const mHeight = p.match(/^height\s*:\s*\+?\s*([0-9]+(?:\.[0-9]+)?)\s*cm$/i);
      if (mHeight && mHeight[1]) {
        const n = Number(mHeight[1]);
        heightCm = Number.isFinite(n) ? n : null;
        continue;
      }
    }

    // 组装一个“去重后的 raw”兜底：
    // - 如果抽到了 color/size/height，就不再把整段 raw0 原样显示（避免 "chocolate | 40" 重复）
    // - 仅当完全抽不到时，才回 raw0
    const hasAny = !!(color || size || heightCm != null);
    return {
      color,
      size,
      heightCm,
      raw: hasAny ? "" : raw0,
    };
  }

  // ---------- (B) 旧格式： "color / size" ----------
  const partsSlash = raw0
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  if (partsSlash.length >= 2) {
    return {
      color: partsSlash[0] ?? null,
      size: partsSlash[1] ?? null,
      heightCm: null,
      raw: raw0,
    };
  }

  // ---------- (C) 其它：不强行判断 ----------
  return { color: null, size: null, heightCm: null, raw: raw0 };
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

  // ✅ 只在“订单切换”时初始化一次，避免 StrictMode / 重新渲染把用户选择重置
  const initForOrderIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!order || !Array.isArray(order.items)) return;

    // 只有当 order.id 改变时，才做“默认全选”
    if (initForOrderIdRef.current === order.id) return;
    initForOrderIdRef.current = order.id;

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
      <h2 className="text-lg font-semibold mb-4">Select items to return</h2>

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
                {/* ✅ thumbnail（修正 Tailwind 默认尺寸） */}
                <div className="w-24 h-28 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 shrink-0 flex items-center justify-center">
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
                  onChange={(e) => toggleItem(itemId, e.target.checked, maxQty)}
                />

                <div>
                  <div className="text-sm font-medium text-neutral-900">
                    {item.product_title || "Item"}
                  </div>

                  {(() => {
                    const { color, size, heightCm, raw } = parseVariantTitle(item.variant_title);

                    return (
                      <>
                        {color && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Color:{" "}
                            <span className="text-neutral-900 font-medium">{color}</span>
                          </div>
                        )}

                        {size && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Size:{" "}
                            <span className="text-neutral-900 font-medium">{size}</span>
                          </div>
                        )}

                        {/* ✅ NEW: Height 单独显示（避免和 variant_title 重复拼接） */}
                        {heightCm != null && (
                          <div className="text-xs text-neutral-500 mt-0.5">
                            Height:{" "}
                            <span className="text-neutral-900 font-medium">
                              +{heightCm} cm
                            </span>
                          </div>
                        )}

                        {!color && !size && heightCm == null && raw && (
                          <div className="text-xs text-neutral-500 mt-0.5">{raw}</div>
                        )}
                      </>
                    );
                  })()}

                  <div className="mt-1 text-xs text-neutral-500">Ordered qty: {maxQty}</div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Unit price: {formatMoney(item.unit_price_minor, currency)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Line total: {formatMoney(item.line_total_minor, currency)}
                  </div>
                </div>
              </div>

              {/* 数量选择区域 */}
              {checked && (
                <div className="flex items-center gap-2 md:min-w-[180px]">
                  <label className="text-xs text-neutral-600">Qty to return</label>
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={selectedQty}
                    onChange={(e) => changeQty(itemId, e.target.value, maxQty)}
                    className="w-20 rounded-full border border-neutral-300 px-3 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  <span className="text-xs text-neutral-500">/ {maxQty}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
