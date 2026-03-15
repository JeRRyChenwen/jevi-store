// src/app/(admin)/admin/(protected)/returns/[id]/return-detail.types.ts

export type ReturnRow = {
  id: number;
  return_number: string | null;
  order_id: number | null;
  order_number: string | null;
  email: string | null;
  status: string | null;

  reason_type: string | null;
  reason_detail: string | null;

  created_at_cn: string | null;
  updated_at_cn: string | null;

  created_at_ts?: number | null;
  updated_at_ts?: number | null;

  items_amount_minor?: number | null;
  delivery_fee_minor?: number | null;
  requested_amount_minor?: number | null;
  currency?: string | null;

  approved_amount_minor?: number | null;
  refunded_amount_minor?: number | null;
  refund_status?: string | null;
  refund_error?: string | null;

  reject_reason?: string | null;
  reject_reason_code?: string | null;
  reject_reason_text?: string | null;

  approved_at_ts?: number | null;
  approved_by?: string | null;

  rejected_at_ts?: number | null;
  rejected_by?: string | null;

  refunded_at_ts?: number | null;
  refunded_by?: string | null;
};

export type ReturnItemRow = {
  id: number;
  return_id: number;
  order_item_id: number;
  qty: number;

  product_title?: string | null;
  variant_title?: string | null;
  size?: string | null;
  color?: string | null;
  variant_sku?: string | null;

  created_at_cn?: string | null;
  created_at_ts?: number | null;
};

export type ApiPayload = {
  ok: boolean;
  return?: ReturnRow;
  items?: ReturnItemRow[];
  error?: string;
  worker_version?: string;
};

export type ReturnAttachmentRow = {
  id: number;
  return_id: number;
  r2_key: string;
  original_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at_ts: number | null;
};

export type AttachmentRow = {
  id: number;
  return_id: number;
  r2_key: string;
  original_name?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  created_at_ts?: number | null;
  raw_url: string;
};

export type AttachmentsApiCompat = {
  ok: boolean;
  return_id?: number;
  attachments?: ReturnAttachmentRow[];
  count?: number;
  files?: AttachmentRow[];
  error?: string;
};

export type RejectReasonOption = {
  value: string;
  label: string;
};

export type RejectReasonGroup = {
  label: string;
  options: RejectReasonOption[];
};

export type UiNotice = {
  variant: "error" | "success" | "warning" | "info";
  message: string;
};