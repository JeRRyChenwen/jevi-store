// src/app/api/braintree/client-token/route.ts

import { NextResponse } from "next/server";
import braintree from "braintree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isBraintreeEnabled(): boolean {
  return (
    String(process.env.ENABLE_BRAINTREE ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

function getGateway(): braintree.BraintreeGateway {
  const {
    BT_MERCHANT_ID,
    BT_PUBLIC_KEY,
    BT_PRIVATE_KEY,
    BT_ENV,
  } = process.env;

  if (
    !BT_MERCHANT_ID ||
    !BT_PUBLIC_KEY ||
    !BT_PRIVATE_KEY
  ) {
    throw new Error(
      "Missing Braintree env vars: BT_MERCHANT_ID/BT_PUBLIC_KEY/BT_PRIVATE_KEY"
    );
  }

  const environment =
    BT_ENV?.trim().toLowerCase() === "production" ||
    BT_ENV?.trim().toLowerCase() === "prod"
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox;

  return new braintree.BraintreeGateway({
    environment,
    merchantId: BT_MERCHANT_ID,
    publicKey: BT_PUBLIC_KEY,
    privateKey: BT_PRIVATE_KEY,
  });
}

export async function GET() {
  if (!isBraintreeEnabled()) {
    return NextResponse.json(
      {
        error: "braintree_disabled",
      },
      { status: 404 }
    );
  }

  try {
    const gateway = getGateway();

    const { clientToken } =
      await gateway.clientToken.generate({});

    return NextResponse.json(
      { clientToken },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create client token";

    console.error(
      "[api/braintree/client-token] error:",
      error
    );

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}