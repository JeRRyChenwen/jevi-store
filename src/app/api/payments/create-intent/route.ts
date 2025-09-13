// src/app/api/payments/create-intent/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // ✅ 用你当前 stripe 包类型里要求的版本字符串
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  try {
    const { amount, currency } = (await req.json()) as {
      amount: number;
      currency: string;
    };

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount (cents)" }, { status: 400 });
    }
    const cur = (currency || "usd").toLowerCase();

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: cur,
      automatic_payment_methods: { enabled: true },
      metadata: { app: "social-platform", env: "sandbox" },
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err: any) {
    console.error("create-intent error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
