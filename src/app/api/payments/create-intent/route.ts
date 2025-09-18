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
const CURRENCY_ALLOWLIST = new Set(["usd", "aud", "eur", "gbp"]);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const amount = Number(body?.amount);
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
        { error: "Invalid amount: integer cents > 0 required" },
        { status: 400 }
      );
    }

    // 货币校验（可按需收敛到你支持的列表）
    if (!/^[a-z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "Invalid currency code" },
        { status: 400 }
      );
    }
    if (!CURRENCY_ALLOWLIST.has(currency)) {
      // 也可以直接放行，这里选择友好报错
      return NextResponse.json(
        { error: `Unsupported currency: ${currency}` },
        { status: 400 }
      );
    }

    // ✅ 仅允许“银行卡”支付（不启用 automatic_payment_methods）
    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        payment_method_types: ["card"],
        // 可选：如果你计划保存卡用于后续代扣，可开启
        // setup_future_usage: "off_session",
        metadata: {
          app: "social-platform",
          env: process.env.NODE_ENV ?? "development",
          delivery: delivery ?? "n/a",
          cart_len: String(cart.length ?? 0),
        },
      },
      // 可选：传入幂等键，避免偶发重复创建
      idempotencyKey ? { idempotencyKey } : undefined
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id, // 便于排错/对账（前端不必使用）
    });
  } catch (err: any) {
    // 尽量输出核心信息但不要泄露敏感对象
    const msg =
      err?.raw?.message ||
      err?.message ||
      "Server error creating PaymentIntent";
    console.error("create-intent error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
