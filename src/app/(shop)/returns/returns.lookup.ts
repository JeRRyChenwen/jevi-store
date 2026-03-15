import type { ReturnOrderDetail } from "./_components/ReturnItemsSelector";

export type LookupSuccess = {
  ok: true;
  order: any;
  foundOrder: ReturnOrderDetail;
};

export type LookupRateLimited = {
  ok: false;
  kind: "rate_limited";
  retryAfterSec: number;
};

export type LookupError = {
  ok: false;
  kind: "error";
  code: string;
  serverMsg: string;
  retryAfterSec: number;
};

export type LookupResult = LookupSuccess | LookupRateLimited | LookupError;

export async function lookupReturnOrder(params: {
  orderNumber: string;
  email: string;
}): Promise<LookupResult> {
  const on = String(params.orderNumber || "").trim();
  const em = String(params.email || "").trim().toLowerCase();

  const res = await fetch(
    `/api/returns/lookup?order_number=${encodeURIComponent(on)}&email=${encodeURIComponent(em)}`,
    { credentials: "include", cache: "no-store" }
  );

  const data = await res.json().catch(() => ({} as any));

  if (!res.ok || !data.ok) {
    const code = String(data?.error || "").trim();
    const serverMsg =
      typeof data?.message === "string" ? data.message.trim() : "";

    const retryAfterFromBody = Number(data?.retry_after_sec ?? 0);
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterFromHeader = retryAfterHeader ? Number(retryAfterHeader) : 0;

    const retryAfterSec =
      (Number.isFinite(retryAfterFromBody) && retryAfterFromBody > 0
        ? retryAfterFromBody
        : 0) ||
      (Number.isFinite(retryAfterFromHeader) && retryAfterFromHeader > 0
        ? retryAfterFromHeader
        : 0);

    console.warn("[returns][lookup] failed", {
      status: res.status,
      code,
      serverMsg,
      retryAfterSec,
      upstream_status: data?.upstream_status,
      upstream_error: data?.upstream_error,
    });

    const lc = code.toLowerCase();
    const isRateLimited =
      res.status === 429 || lc === "rate_limited" || lc === "too_many_requests";

    if (isRateLimited) {
      return {
        ok: false,
        kind: "rate_limited",
        retryAfterSec: retryAfterSec > 0 ? retryAfterSec : 60,
      };
    }

    return {
      ok: false,
      kind: "error",
      code,
      serverMsg,
      retryAfterSec,
    };
  }

  const foundOrder: ReturnOrderDetail = {
    ...(data.order || {}),
    items: data.items || [],
  };

  return {
    ok: true,
    order: data.order,
    foundOrder,
  };
}