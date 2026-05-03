// src/app/api/paypal/orders/[orderId]/capture/route.ts
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

function getPayPalEnvInfo() {
  const paypalEnv = String(process.env.PAYPAL_ENV || "sandbox")
    .trim()
    .toLowerCase();

  const clientId = String(process.env.PAYPAL_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || "").trim();

  return {
    paypalEnv,
    clientId,
    clientSecret,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdPrefix: clientId ? clientId.slice(0, 8) : "",
  };
}

async function getPayPalAccessToken() {
  const { clientId, clientSecret, hasClientId, hasClientSecret } =
    getPayPalEnvInfo();

  if (!hasClientId || !hasClientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok || !data?.access_token) {
    throw new Error(
      `PayPal token failed: ${res.status} ${JSON.stringify(data || {})}`
    );
  }

  return String(data.access_token);
}

type RouteContext =
  | { params: { orderId: string } }
  | { params: Promise<{ orderId: string }> };

async function getOrderId(ctx: RouteContext) {
  const params = await Promise.resolve((ctx as any).params);
  return String(params?.orderId || "").trim();
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const envInfo = getPayPalEnvInfo();

  try {
    const orderId = await getOrderId(ctx);

    if (!orderId) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_paypal_order_id",
          message: "Missing PayPal order id.",
        },
        { status: 400 }
      );
    }

    if (!envInfo.hasClientId || !envInfo.hasClientSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "missing_paypal_env",
          message: "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET",
          env: {
            paypalEnv: envInfo.paypalEnv,
            hasClientId: envInfo.hasClientId,
            hasClientSecret: envInfo.hasClientSecret,
            clientIdPrefix: envInfo.clientIdPrefix,
          },
        },
        { status: 500 }
      );
    }

    const accessToken = await getPayPalAccessToken();

    const paypalRes = await fetch(
      `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(
        orderId
      )}/capture`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          accept: "application/json",
          "paypal-request-id": `jevi-capture-${orderId}-${Date.now()}`,
        },
        body: "{}",
        cache: "no-store",
      }
    );

    const text = await paypalRes.text();

    let paypalData: any = null;
    try {
      paypalData = text ? JSON.parse(text) : null;
    } catch {
      paypalData = { raw: text };
    }

    if (!paypalRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "paypal_capture_failed",
          status: paypalRes.status,
          detail: paypalData,
          env: {
            paypalEnv: envInfo.paypalEnv,
            hasClientId: envInfo.hasClientId,
            hasClientSecret: envInfo.hasClientSecret,
            clientIdPrefix: envInfo.clientIdPrefix,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        id: paypalData?.id || orderId,
        paypalOrderId: paypalData?.id || orderId,
        raw: paypalData,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "paypal_capture_exception",
        message: err?.message || String(err),
        env: {
          paypalEnv: envInfo.paypalEnv,
          hasClientId: envInfo.hasClientId,
          hasClientSecret: envInfo.hasClientSecret,
          clientIdPrefix: envInfo.clientIdPrefix,
        },
      },
      { status: 500 }
    );
  }
}