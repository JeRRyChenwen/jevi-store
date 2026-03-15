export type ApiReturnRow = {
  id: number;

  return_number?: string | null;
  order_id?: number | null;
  order_number?: string | null;
  email?: string | null;
  status?: string | null;

  created_at_cn?: string | null;
  created_at?: string | null;
  created_at_ts?: number | null;
};

export type ApiResponse = {
  ok: boolean;
  returns?: ApiReturnRow[];
  page?: number;
  page_size?: number;
  total?: number;
  error?: string;
};

export type SortBy = "return_id" | "order_id" | "created_at";
export type SortDir = "asc" | "desc";