// src/app/(admin)/admin/(protected)/orders/orders.types.ts

export type ApiOrderRow = {
  id: number;
  order_number?: string | null;
  status?: string | null;

  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;

  currency?: string | null;
  items_total_minor?: number | null;
  delivery_fee_minor?: number | null;
  grand_total_minor?: number | null;

  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;

  created_at_ts?: number | null;
  shipped_at_ts?: number | null;
  shipment_email_sent_at_ts?: number | null;

  created_at_cn?: string | null;
  shipped_at_cn?: string | null;
  shipment_email_sent_at_cn?: string | null;

  paid_at_ts?: number | null;
  paid_at_cn?: string | null;
};

export type ApiResponse = {
  ok: boolean;
  orders?: ApiOrderRow[];
  page?: number;
  page_size?: number;
  total?: number;
  error?: string;
};