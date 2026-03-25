// src/app/api/braintree/checkout/route.ts
import { NextResponse } from "next/server";
import braintree, { Environment } from "braintree";

const gateway = new braintree.BraintreeGateway({
  environment: Environment.Sandbox, // 👈 生产环境再改成 Environment.Production
  merchantId: process.env.BT_MERCHANT_ID!,
  publicKey: process.env.BT_PUBLIC_KEY!,
  privateKey: process.env.BT_PRIVATE_KEY!,
});

// 各币种小数位
const DECIMALS: Record<string, number> = {
  AUD: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
};

// 币种 -> Merchant Account ID 映射
const MA_MAP: Record<string, string | undefined> = {
  AUD: process.env.BT_MERCHANT_ACCOUNT_AUD,
  USD: process.env.BT_MERCHANT_ACCOUNT_USD,
  EUR: process.env.BT_MERCHANT_ACCOUNT_EUR,
  GBP: process.env.BT_MERCHANT_ACCOUNT_GBP,
  CAD: process.env.BT_MERCHANT_ACCOUNT_CAD,
};

function formatAmount(n: number, currency: string) {
  const dec = DECIMALS[currency] ?? 2;
  return n.toFixed(dec); // Braintree 要求字符串金额
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nonce: string = body?.nonce;
    const currency = String(body?.currency || "").trim().toUpperCase();
    const amountNum =
      typeof body?.amount === "string"
        ? Number(body.amount)
        : Number(body?.amount);

    // -------- 参数校验 --------
    if (!nonce) {
      return NextResponse.json(
        { ok: false, error: "Missing payment method nonce" },
        { status: 400 }
      );
    }

    if (!currency) {
      return NextResponse.json(
        { ok: false, error: "Missing currency" },
        { status: 400 }
      );
    }

    if (!MA_MAP[currency] && !(currency in DECIMALS)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported currency: ${currency}` },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // -------- 组装 sale 请求 --------
    const merchantAccountId = MA_MAP[currency];

    const saleReq: any = {
      amount: formatAmount(amountNum, currency),
      paymentMethodNonce: nonce,
      options: { submitForSettlement: true }, // 直接清算；需要的话可以只授权
    };

    // 若配置了对应币种的 merchant account，就显式指定
    if (merchantAccountId) {
      saleReq.merchantAccountId = merchantAccountId;
    }

    const result = await gateway.transaction.sale(saleReq);

    if (!result.success || !result.transaction) {
      const tx = result.transaction;
      const code =
        tx?.processorResponseCode ||
        tx?.status ||
        "failed";
      const msg =
        result?.message ||
        tx?.processorResponseText ||
        "Braintree sale failed";

      console.error("braintree sale not successful:", result);
      return NextResponse.json(
        { ok: false, error: `${code}: ${msg}` },
        { status: 400 }
      );
    }

    const tx = result.transaction;

    // -------- 粗略判断是 card 还是 PayPal --------
    const instrument = (tx.paymentInstrumentType || "").toLowerCase();
    const isPayPal =
      instrument.includes("paypal") || !!(tx as any).paypalDetails;

    const paymentMethod = isPayPal ? "paypal" : "card";
    const cardBrand = isPayPal ? null : tx.creditCard?.cardType ?? null;
    const cardLast4 = isPayPal ? null : tx.creditCard?.last4 ?? null;

    // -------- 返回给前端的 payload --------
    return NextResponse.json(
      {
        ok: true,
        id: tx.id,
        transactionId: tx.id,
        paymentMethod,
        cardBrand,
        cardLast4,
        currency: tx.currencyIsoCode,
        amount: tx.amount,
        raw: tx, // 保留原始 transaction，方便调试
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("braintree checkout error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
