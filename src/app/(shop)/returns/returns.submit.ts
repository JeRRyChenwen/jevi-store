export type SubmitSelectedItem = {
  order_item_id: number;
  qty: number;
};

export type SubmitReturnSuccess = {
  ok: true;
  data: any;
};

export type SubmitReturnConflictCode =
  | "item_already_returned"
  | "duplicate_return_request"
  | "return_qty_exceeds_available";

export type SubmitReturnConflict = {
  ok: false;
  kind: "conflict";
  errorCode: SubmitReturnConflictCode;
  rawErrorCode: string;
  message?: string;
  violations?: Array<{
    order_item_id: number;
    requested_qty: number;
    purchased_qty: number;
    occupied_return_qty?: number;
    already_approved_qty?: number;
    available_qty?: number;
    available_to_approve?: number;
  }>;
};

export type SubmitReturnError = {
  ok: false;
  kind: "error";
  errorCode: string;
  message?: string;
};

export type SubmitReturnResult =
  | SubmitReturnSuccess
  | SubmitReturnConflict
  | SubmitReturnError;

function normalizeConflictCode(raw: string): SubmitReturnConflictCode {
  const code = String(raw || "").trim();

  if (code === "item_already_returned") return "item_already_returned";
  if (code === "return_qty_exceeds_available") return "return_qty_exceeds_available";

  return "duplicate_return_request";
}

export async function submitReturnRequest(params: {
  orderNumberOrId: string | number;
  email: string;
  reasonType: string;
  reasonDetail: string;
  items: SubmitSelectedItem[];
}): Promise<SubmitReturnResult> {
  const res = await fetch("/api/returns", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      order_number: params.orderNumberOrId,
      reason_type: params.reasonType,
      reason_detail: params.reasonDetail,
      items: params.items,
      email: String(params.email || "").trim().toLowerCase(),
    }),
  });

  const data = await res.json().catch(() => ({} as any));

  if (!res.ok || !data.ok) {
    const errCode = String(data?.error || "").trim();
    const message = typeof data?.message === "string" ? data.message.trim() : "";

    if (res.status === 409) {
      return {
        ok: false,
        kind: "conflict",
        errorCode: normalizeConflictCode(errCode),
        rawErrorCode: errCode,
        message,
        violations: Array.isArray(data?.violations) ? data.violations : [],
      };
    }

    return {
      ok: false,
      kind: "error",
      errorCode: errCode || "Failed to submit return.",
      message,
    };
  }

  return {
    ok: true,
    data,
  };
}