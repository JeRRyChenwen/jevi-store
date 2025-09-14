import { NextResponse } from "next/server";
import braintree, { Environment } from "braintree";

const gateway = new braintree.BraintreeGateway({
  environment: Environment.Sandbox,
  merchantId: process.env.BT_MERCHANT_ID!,
  publicKey:  process.env.BT_PUBLIC_KEY!,
  privateKey: process.env.BT_PRIVATE_KEY!,
});

export async function GET() {
  try {
    const { clientToken } = await gateway.clientToken.generate({});
    return NextResponse.json({ clientToken }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    console.error("token error", err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
