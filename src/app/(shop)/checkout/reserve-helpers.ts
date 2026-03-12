// src/app/(shop)/checkout/reserve-helpers.ts

export type ReserveItem = { sku: string; qty: number };

// ✅ 从 cart 提取 reserve items（兼容你 cart 结构）
export function cartToReserveItems(cartAny: any[]): ReserveItem[] {
  const list = Array.isArray(cartAny) ? cartAny : [];
  const out: ReserveItem[] = [];

  for (const it of list) {
    const sku = String((it as any)?.product_sku ?? (it as any)?.sku ?? "").trim();
    const qtyRaw = Number((it as any)?.qty ?? (it as any)?.quantity ?? 1);
    const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
    if (!sku) continue;
    out.push({ sku, qty });
  }

  // 合并同 sku
  const merged = new Map<string, number>();
  for (const x of out) {
    merged.set(x.sku, (merged.get(x.sku) ?? 0) + x.qty);
  }

  return Array.from(merged.entries()).map(([sku, qty]) => ({ sku, qty }));
}

// ✅ cart_hash 生成规则：sku:qty 排序后用 | 拼接（与你 worker genCartHash 对齐）
export function buildCartHash(items: ReserveItem[]): string {
  return items
    .map((x) => `${String(x.sku).trim()}:${Math.max(1, Math.floor(Number(x.qty) || 1))}`)
    .sort()
    .join("|");
}