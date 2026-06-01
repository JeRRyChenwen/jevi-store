// D:\前端练习\jevi-store\src\app\api\orders\[orderId]\route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "") ||
  "http://127.0.0.1:8787";

function parseSpUserCookie(raw?: string | null): { id?: number | null; email?: string | null } {
  if (!raw) return {};
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    const obj = JSON.parse(json);
    const id =
      obj && typeof obj.id !== "undefined"
        ? Number(obj.id)
        : obj && typeof obj.user_id !== "undefined"
        ? Number(obj.user_id)
        : null;
    const email =
      obj && typeof obj.email === "string" ? obj.email.trim().toLowerCase() : null;
    return { id: Number.isFinite(id as number) ? (id as number) : null, email };
  } catch {
    return {};
  }
}

/** 把 order 里常见的地址字段，组装成 confirmation page 需要的 shipping_address_json */
function buildShippingAddressJson(order: any) {
  if (!order || typeof order !== "object") return null;

  // 1) 如果后端本来就给了 shipping_address_json，直接用
  if (order.shipping_address_json && typeof order.shipping_address_json === "object") {
    return order.shipping_address_json;
  }

  // 2) 否则从你 D1 orders 表常见字段拼出来（你 PayPalBigButton 发的就是这套）
  const firstName = order.first_name ?? order.firstName ?? null;
  const lastName = order.last_name ?? order.lastName ?? null;
  const email = order.email ?? null;
  const phone = order.phone ?? null;

  const line1 = order.addr_line1 ?? order.line1 ?? order.address_line1 ?? null;
  const line2 = order.addr_line2 ?? order.line2 ?? order.address_line2 ?? null;
  const city = order.addr_city ?? order.city ?? null;
  const state = order.addr_state ?? order.state ?? null;
  const postcode = order.addr_postcode ?? order.postcode ?? null;
  const country = order.addr_country ?? order.country ?? null;

  const hasAny =
    firstName || lastName || email || phone || line1 || line2 || city || state || postcode || country;

  if (!hasAny) return null;

  return {
    firstName,
    lastName,
    email,
    phone,
    line1,
    line2,
    city,
    state,
    postcode,
    country,
  };
}

export async function GET(req: NextRequest, ctx: { params: { orderId: string } }) {
  const rawId = String(ctx?.params?.orderId || "").trim();

  if (!rawId) {
    return NextResponse.json({ ok: false, error: "invalid_order_id" }, { status: 400 });
  }

  const safeOrderId = encodeURIComponent(rawId);

  // 透传 cookie，方便 Worker 做鉴权/关联用户（即使你现在只是本地也更稳）
  const cookieHeader = req.headers.get("cookie") || "";

  // 从本地域 Cookie 解析 sp_user，附加到 header（Worker 兜底用）
  const spUserRaw = req.cookies.get("sp_user")?.value || null;
  const spUser = parseSpUserCookie(spUserRaw);

  const extraHeaders: Record<string, string> = {};
  if (spUser.email) extraHeaders["x-sp-user-email"] = spUser.email;
  if (spUser.id != null) extraHeaders["x-sp-user-id"] = String(spUser.id);

  const url = new URL(req.url);
  const email =
    url.searchParams.get("email") ||
    url.searchParams.get("customerEmail") ||
    "";

  const upstreamUrl = new URL(`${API_BASE}/orders/${safeOrderId}`);
  if (email.trim()) {
    upstreamUrl.searchParams.set("email", email.trim());
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        cookie: cookieHeader,
        ...extraHeaders,
      } as HeadersInit,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream_unavailable" }, { status: 502 });
  }

  let data: any = null;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_upstream_json" }, { status: 502 });
  }

  // 兼容两种上游返回：
  // A) { ok:true, order, items }
  // B) { order, items }（没 ok）
  const ok = Boolean(data?.ok ?? true);
  const order = data?.order ?? null;
  const items = Array.isArray(data?.items) ? data.items : [];

  if (!upstream.ok || !ok || !order) {
    return NextResponse.json(
      {
        ok: false,
        error: data?.error || "fetch_failed",
        upstream_status: upstream.status,
        upstream_error: data?.error,
      },
      { status: upstream.status || 502 }
    );
  }

  // ✅ 关键：补齐 confirmation page 要用的地址对象
  const shipping_address_json = buildShippingAddressJson(order);

  return NextResponse.json(
    {
      ok: true,
      order: {
        ...order,
        shipping_address_json, // 给 page.tsx 直接渲染
      },
      items,
      worker_version: data?.worker_version,
    },
    { status: 200 }
  );
}