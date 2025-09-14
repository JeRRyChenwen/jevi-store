// src/app/api/braintree/client-token/route.ts
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
    return NextResponse.json({ clientToken });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create client token" }, { status: 500 });
  }
}
