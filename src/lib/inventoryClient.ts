// src/lib/inventoryClient.ts

export async function fetchStocksBySkus(skus: string[]) {
  const uniq = Array.from(new Set((skus || []).map((s) => String(s || "").trim()).filter(Boolean)));
  if (uniq.length === 0) return {} as Record<string, number>;

  const qs = encodeURIComponent(uniq.join(","));
  const r = await fetch(`/api/inventory/bulk?skus=${qs}`, {
    method: "GET",
    cache: "no-store",
  });

  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok) {
    throw new Error(j?.error || "inventory_fetch_failed");
  }

  return (j?.stocks ?? {}) as Record<string, number>;
}
