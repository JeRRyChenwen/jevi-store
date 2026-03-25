// src/lib/paypalPreloader.ts
let preloadPromise: Promise<void> | null = null;

function loadScriptOnce(src: string, attrs: Record<string, string> = {}) {
  return new Promise<void>((resolve, reject) => {
    // 已存在就直接 OK
    const namespace = attrs["data-namespace"] || "paypal";
    if ((window as any)[namespace]) return resolve();

    // 检查是否已经有同 src 的脚本
    const existed = Array.from(document.scripts).some(s => s.src.includes("www.paypal.com/sdk/js"));
    if (existed) return resolve();

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("paypal sdk load failed"));
    document.head.appendChild(s);
  });
}

async function getClientToken(): Promise<string> {
  const KEY = "bt:clientToken";
  const cached = sessionStorage.getItem(KEY);
  if (cached) return cached;

  const r = await fetch("/api/braintree/token", { cache: "no-store" });
  if (!r.ok) throw new Error("fail to get clientToken");
  const { clientToken } = await r.json();
  sessionStorage.setItem(KEY, clientToken);
  return clientToken;
}

/**
 * 预加载 PayPal SDK + 创建（并缓存）Braintree PayPal 实例
 * currency: "AUD" | "USD" | ...
 * client-id: 沙箱用 "sb"，正式填你 PayPal 的 client id（与 Braintree 搭配也可用）
 */
export function preloadPaypalForBraintree(
  currency: string,
  paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "sb",
) {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const safeCurrency = String(currency || "").trim().toUpperCase() || "AUD";
    const token = await getClientToken();

    // 1) 提前加载 PayPal SDK（带 data-client-token 让它对接 Braintree）
    const params = new URLSearchParams({
      "client-id": paypalClientId,
      components: "buttons,marks",
      currency: safeCurrency,
      intent: "capture",
      commit: "true",
      "enable-funding": "paypal",
    });
    await loadScriptOnce(
      `https://www.paypal.com/sdk/js?${params.toString()}`,
      {
        // 建议自定义命名空间，防止与你其它集成冲突
        "data-namespace": "paypalBT",
        "data-client-token": token,
      }
    );

    // 2) 动态引入 braintree-web，并创建实例（缓存到 window 以便复用）
    if (!(window as any).__btPaypalCheckoutInstance) {
      const braintree = await import("braintree-web");
      const client = await braintree.client.create({ authorization: token });
      const paypalCheckout = await braintree.paypalCheckout.create({ client });
      (window as any).__btPaypalClient = client;
      (window as any).__btPaypalCheckoutInstance = paypalCheckout;
    }
  })();

  return preloadPromise;
}
