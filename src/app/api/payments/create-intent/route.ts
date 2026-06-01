// src/app/api/payments/create-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_ENABLED = process.env.ENABLE_STRIPE === "true";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_ENABLED && STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : (null as any);

// 允许的币种（保持你现有多币种）
const CURRENCY_ALLOWLIST = new Set(["usd", "aud", "eur", "gbp", "cad"]);

export async function POST(req: Request) {
  try {
    if (!STRIPE_ENABLED) {
      return NextResponse.json(
        { error: "Stripe card payments are disabled" },
        { status: 410 } // Gone
      );
    }

    const body = await req.json();
    const amount = Number(body?.amount);
    const currency = String(body?.currency ?? "").trim().toLowerCase();
    const delivery = (body?.delivery ?? null) as string | null;
    const cart = Array.isArray(body?.cart) ? body.cart : [];
    const idempotencyKey =
      typeof body?.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : undefined;

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount: integer minor units > 0 required" },
        { status: 400 }
      );
    }

    if (!currency) {
      return NextResponse.json({ error: "Missing currency" }, { status: 400 });
    }

    if (!/^[a-z]{3}$/.test(currency) || !CURRENCY_ALLOWLIST.has(currency)) {
      return NextResponse.json({ error: `Unsupported currency: ${currency}` }, { status: 400 });
    }

    const intent = await stripe.paymentIntents.create(
      {
        amount,
        currency,
        payment_method_types: ["card"], // 仅卡
        metadata: {
          app: "jevi-store",
          env: process.env.NODE_ENV ?? "development",
          delivery: delivery ?? "n/a",
          cart_len: String(cart.length ?? 0),
        },
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    });
  } catch (err: any) {
    const msg = err?.raw?.message || err?.message || "Server error creating PaymentIntent";
    console.error("create-intent error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
