// src/app/(shop)/returns/types.ts

export type OrderSummary = {
  id: number;
  order_number?: string | null;
  email: string | null;
  status: string | null;
  currency: string | null;
  grand_total_minor: number;
  created_at_cn?: string | null;
};

// ✅ /api/returns/bootstrap 返回的订单行（来自 /my/orders）
export type MyOrderRow = {
  id: number;
  order_number?: string | null;
  email: string | null;
  currency: string | null;
  total_minor: number;
  status: string | null;
  item_count: number;

  // ✅ legacy（后端格式化字符串，未来可逐步不用）
  created_at_cn?: string | null;
  updated_at_cn?: string | null;
  paid_at_cn?: string | null;

  // ✅ NEW: epoch 秒（UTC）——用户侧展示统一走它
  created_at_ts?: number | null;
  updated_at_ts?: number | null;
  paid_at_ts?: number | null;
};

export type ReturnsBootstrapResp = {
  ok: boolean;
  authed: boolean;
  email: string | null;
  orders: MyOrderRow[];

  // ✅ NEW: pagination metadata (from worker /my/orders)
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;

  error?: string;
  worker_version?: string;
};

export type StrapiImage = {
  url?: string | null;
  formats?: { thumbnail?: { url?: string | null } };
};

export type StrapiMediaRel =
  | { data?: { attributes?: StrapiImage }[] }
  | { attributes?: StrapiImage }[]
  | StrapiImage[]
  | StrapiImage
  | any;

/** ✅ 与 admin 一致的排序方向 */
export type SortDir = "asc" | "desc";

/** ✅ Returns 页面表头排序字段 */
export type SortKey = "order" | "paidAt" | "amount";

export type SelectedImg = {
  id: string;
  file: File;
  previewUrl: string;
};