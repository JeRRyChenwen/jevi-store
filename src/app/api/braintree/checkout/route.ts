// src/app/api/braintree/checkout/route.ts
import { NextResponse } from "next/server";
import braintree, { Environment } from "braintree";

const gateway = new braintree.BraintreeGateway({
  environment: Environment.Sandbox, // 生产改为 Environment.Production
  merchantId: process.env.BT_MERCHANT_ID!,
  publicKey:  process.env.BT_PUBLIC_KEY!,
  privateKey: process.env.BT_PRIVATE_KEY!,
});

// 各币种小数位（需要 JPY 等再扩展为 0）
const DECIMALS: Record<string, number> = {
  AUD: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
};

// 币种 -> Merchant Account ID 映射（用你的 .env 值）
const MA_MAP: Record<string, string | undefined> = {
  AUD: process.env.BT_MERCHANT_ACCOUNT_AUD,
  USD: process.env.BT_MERCHANT_ACCOUNT_USD,
  EUR: process.env.BT_MERCHANT_ACCOUNT_EUR,
  GBP: process.env.BT_MERCHANT_ACCOUNT_GBP,
  CAD: process.env.BT_MERCHANT_ACCOUNT_CAD,
};

function formatAmount(n: number, currency: string) {
  const dec = DECIMALS[currency] ?? 2;
  return n.toFixed(dec); // Braintree 要求字符串，并按对应小数位
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nonce: string = body?.nonce;
    const currency = (body?.currency || "AUD").toString().toUpperCase();
    const amountNum = typeof body?.amount === "string" ? Number(body.amount) : Number(body?.amount);

    // 参数校验
    if (!nonce) {
      return NextResponse.json({ error: "Missing payment method nonce" }, { status: 400 });
    }
    if (!isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const merchantAccountId = MA_MAP[currency];
    if (!merchantAccountId) {
      return NextResponse.json(
        { error: `Unsupported currency ${currency}. Configure BT_MERCHANT_ACCOUNT_${currency} in .env.` },
        { status: 400 }
      );
    }

    const result = await gateway.transaction.sale({
      amount: formatAmount(amountNum, currency),
      merchantAccountId,                 // ✅ 与币种匹配
      paymentMethodNonce: nonce,
      options: { submitForSettlement: true }, // 沙箱直接清算；生产可视需要仅授权
    });

    if (!result.success) {
      const tx = result.transaction;
      const code = tx?.processorResponseCode || tx?.status || "failed";
      const msg = result?.message || tx?.processorResponseText || "Braintree sale failed";
      return NextResponse.json({ error: `${code}: ${msg}` }, { status: 400 });
    }

    const tx = result.transaction!;
    return NextResponse.json({
      ok: true,
      transactionId: tx.id,
      currency: tx.currencyIsoCode,
      amount: tx.amount,
    });
  } catch (err: any) {
    console.error("braintree checkout error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
