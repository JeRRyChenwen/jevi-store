import { NextResponse } from "next/server";
import braintree, { Environment } from "braintree";

const gateway = new braintree.BraintreeGateway({
  environment: Environment.Sandbox,
  merchantId: process.env.BT_MERCHANT_ID!,
  publicKey:  process.env.BT_PUBLIC_KEY!,
  privateKey: process.env.BT_PRIVATE_KEY!,
});

// 币种到 merchantAccountId 的映射（按需维护）
const MA_MAP: Record<string, string | undefined> = {
  USD: process.env.BT_MERCHANT_ACCOUNT_USD,
  AUD: process.env.BT_MERCHANT_ACCOUNT_AUD,
  // EUR: process.env.BT_MERCHANT_ACCOUNT_EUR,
};

export async function POST(req: Request) {
  try {
    const { nonce, amount, currency = "USD" } = await req.json() as {
      nonce: string; amount: number; currency?: string;
    };

    if (!nonce) return NextResponse.json({ error: "Missing nonce" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const merchantAccountId = MA_MAP[currency.toUpperCase()];

    const result = await gateway.transaction.sale({
      amount: Number(amount).toFixed(2),          // 金额必须是字符串，保留两位
      paymentMethodNonce: nonce,
      merchantAccountId,                          // 只有当你用非默认币种时需要
      options: { submitForSettlement: true },     // 直接提交清算（真实环境可视情况先授权）
    });

    if (!result.success) {
      // 常见错误：91565（币种不支持/商户号不匹配）
      return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: result.transaction?.id });
  } catch (err: any) {
    console.error("checkout error", err);
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
