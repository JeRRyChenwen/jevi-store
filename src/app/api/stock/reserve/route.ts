import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const WORKER_BASE = process.env.API_PROXY || "http://127.0.0.1:8787";

function newCheckoutSessionId() {
  // Node/Next 运行时一般有 crypto.randomUUID()
  // 如果没有就降级
  try {
    // @ts-ignore
    return crypto.randomUUID();
  } catch {
    return `cs_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export async function POST(req: Request) {
  console.log("[api/stock/reserve] hit route handler");
  console.log("[api/stock/reserve] raw cookie header =", req.headers.get("cookie"));

  try {
    const body = await req.json().catch(() => ({}));

    // ✅ 关键：Next 15+ 这里 cookies() 可能是 Promise
    const jar = await cookies();
    let checkoutSessionId = jar.get("checkout_session_id")?.value || null;

    // ✅ 如果浏览器没带 cookie：这里现场生成并写回浏览器
    let createdNew = false;
    if (!checkoutSessionId) {
      checkoutSessionId = newCheckoutSessionId();
      createdNew = true;
      console.log("[api/stock/reserve] checkout_session_id missing -> generated =", checkoutSessionId);
    } else {
      console.log("[api/stock/reserve] checkout_session_id =", checkoutSessionId);
    }

    // ✅ 注入 Worker 需要的字段（body 优先，其次 cookie/新生成）
    const forwardBody = {
      ...body,
      checkout_session_id: body?.checkout_session_id ?? checkoutSessionId,
    };

    const resp = await fetch(`${WORKER_BASE}/stock/reserve`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // ✅ 双保险：header 也带上（Worker 端可读）
        "x-checkout-session-id": checkoutSessionId ?? "",
      },
      body: JSON.stringify(forwardBody),
    });

    const data = await resp.json().catch(() => null);

    // ✅ 用 NextResponse 才能 set cookie
    const res = NextResponse.json(data, { status: resp.status });

    // ✅ 只有当本次是新生成的，才 Set-Cookie
    if (createdNew && checkoutSessionId) {
      res.cookies.set({
        name: "checkout_session_id",
        value: checkoutSessionId,
        httpOnly: true,     // ✅ 前端 JS 不需要读；安全些
        sameSite: "lax",
        secure: false,      // ✅ 本地 http 必须 false；上线再改 true
        path: "/",          // ✅ 必须是 /，否则 /api 拿不到
        maxAge: 60 * 60 * 24 * 7, // 7 天（可按你需求调整）
      });
    }

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "server_error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
