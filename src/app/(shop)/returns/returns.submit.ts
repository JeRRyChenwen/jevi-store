export type SubmitSelectedItem = {
  order_item_id: number;
  qty: number;
};

export type SubmitReturnSuccess = {
  ok: true;
  data: any;
};

export type SubmitReturnConflict = {
  ok: false;
  kind: "conflict";
  errorCode: "item_already_returned" | "duplicate_return_request";
  rawErrorCode: string;
};

export type SubmitReturnError = {
  ok: false;
  kind: "error";
  errorCode: string;
};

export type SubmitReturnResult =
  | SubmitReturnSuccess
  | SubmitReturnConflict
  | SubmitReturnError;

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
    const errCode = String(data?.error || "");

    if (res.status === 409) {
      return {
        ok: false,
        kind: "conflict",
        errorCode:
          errCode === "item_already_returned"
            ? "item_already_returned"
            : "duplicate_return_request",
        rawErrorCode: errCode,
      };
    }

    return {
      ok: false,
      kind: "error",
      errorCode: errCode || "Failed to submit return.",
    };
  }

  return {
    ok: true,
    data,
  };
}