import { NextResponse } from "next/server";
import braintree from "braintree";

// ⬅️ 关键：确保用 Node.js runtime（Edge 不支持 braintree 的 Node SDK）
export const runtime = "nodejs";

// （可选）禁用任何再验证缓存
export const revalidate = 0;

declare global {
  // HMR 下在 dev 复用已创建的 gateway，避免重复构造
  // eslint-disable-next-line no-var
  var __btGateway: braintree.BraintreeGateway | undefined;
}


function isBraintreeEnabled(): boolean {
  return (
    String(process.env.ENABLE_BRAINTREE ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

function getGateway(): braintree.BraintreeGateway {
  if (global.__btGateway) return global.__btGateway;

  const {
    BT_MERCHANT_ID,
    BT_PUBLIC_KEY,
    BT_PRIVATE_KEY,
    BT_ENV, // "production" | "sandbox"（可选）
  } = process.env;

  if (!BT_MERCHANT_ID || !BT_PUBLIC_KEY || !BT_PRIVATE_KEY) {
    throw new Error("Missing Braintree env vars: BT_MERCHANT_ID/BT_PUBLIC_KEY/BT_PRIVATE_KEY");
  }

  const env =
    BT_ENV?.toLowerCase() === "production" || BT_ENV?.toLowerCase() === "prod"
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox;

  global.__btGateway = new braintree.BraintreeGateway({
    environment: env,
    merchantId: BT_MERCHANT_ID,
    publicKey: BT_PUBLIC_KEY,
    privateKey: BT_PRIVATE_KEY,
  });

  return global.__btGateway;
}

export async function GET() {
  if (!isBraintreeEnabled()) {
    return NextResponse.json(
      {
        error: "braintree_disabled",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const gateway = getGateway();
    const { clientToken } = await gateway.clientToken.generate({});
    return NextResponse.json(
      { clientToken },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    // 详细错误打印到服务端日志，前端仅返回简要信息
    console.error("[api/braintree/token] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate clientToken" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
