// src/app/api/paypal/orders/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPayPalBaseUrl() {
  const env = String(process.env.PAYPAL_ENV || "sandbox")
    .trim()
    .toLowerCase();

  return env === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.access_token) {
    return Promise.reject(
      new Error(
        `PayPal token failed: ${res.status} ${JSON.stringify(data || {})}`
      )
    );
  }

  return String(data.access_token);
}

function normalizeAmount(value: unknown) {
  const n = Number(value);

  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }

  return n.toFixed(2);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const amount = normalizeAmount(body?.amount);
    const currency = String(body?.currency || "")
      .trim()
      .toUpperCase();

    if (!amount) {
      return NextResponse.json(
        { ok: false, error: "invalid_amount" },
        { status: 400 }
      );
    }

    if (!currency) {
      return NextResponse.json(
        { ok: false, error: "missing_currency" },
        { status: 400 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount,
            },
          },
        ],
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "paypal_create_order_failed",
          status: res.status,
          detail: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: data.id,
        paypalOrderId: data.id,
        raw: data,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "paypal_create_order_exception",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}