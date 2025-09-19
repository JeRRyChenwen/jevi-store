// src/app/api/payments/create-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

// --- Stripe 初始化 ---
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}
// 不显式指定 apiVersion，使用 SDK 默认，避免版本不匹配告警
const stripe = new Stripe(STRIPE_SECRET_KEY);

// ---- 辅助校验 ----
// 允许的展示/结算币种（amount 必须是“最小货币单位”的整数）
const CURRENCY_ALLOWLIST = new Set(["usd", "aud", "eur", "gbp", "cad"]); // ✅ 新增 cad/gbp

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const amount = Number(body?.amount); // 最小货币单位：如 12.34 AUD => 1234
    let currency: string = (body?.currency ?? "usd").toString().toLowerCase();
    const delivery = (body?.delivery ?? null) as string | null;
    const cart = Array.isArray(body?.cart) ? body.cart : [];
    const idempotencyKey: string | undefined =
      typeof body?.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : undefined;

    // 金额（分）校验
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount: integer minor units > 0 required" },
        { status: 400 }
      );
    }

    // 货币校验
    if (!/^[a-z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Invalid currency code" }, { status: 400 });
    }
    if (!CURRENCY_ALLOWLIST.has(currency)) {
      return NextResponse.json(
        { error: `Unsupported currency: ${currency}` },
        { status: 400 }
      );
    }

    // ✅ 仅允许银行卡（不启用 automatic_payment_methods）
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        payment_method_types: ["card"],
        // 如果以后要保存卡可启用：
        // setup_future_usage: "off_session",
        metadata: {
          app: "social-platform",
          env: process.env.NODE_ENV ?? "development",
          delivery: delivery ?? "n/a",
          cart_len: String(cart.length ?? 0),
        },
      },
      // 幂等键可避免重复创建
      idempotencyKey ? { idempotencyKey } : undefined
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id, // 便于排错/对账
    });
  } catch (err: any) {
    const msg =
      err?.raw?.message ||
      err?.message ||
      "Server error creating PaymentIntent";
    console.error("create-intent error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
