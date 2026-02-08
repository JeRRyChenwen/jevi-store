// src/lib/productNew.ts
export function isNewProduct(p: { new_starts_at?: string | null; new_ends_at?: string | null } | null | undefined) {
  const now = Date.now();

  const from = p?.new_starts_at ? new Date(p.new_starts_at).getTime() : null;
  const to = p?.new_ends_at ? new Date(p.new_ends_at).getTime() : null;

  if (from == null && to == null) return false;
  if (from != null && now < from) return false;
  if (to != null && now > to) return false;
  return true;
}
