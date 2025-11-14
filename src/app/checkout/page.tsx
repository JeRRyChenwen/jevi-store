// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CartItem as CartListItem } from "@/components/cart/CartList";
import { selectCurrencyAndTotals } from "@/lib/cartPricing";
import { effectiveMinor, type PriceRec, type Currency } from "@/lib/pricing";
import { fetchAuthedEmail, isLoggedInViaCookie } from "@/lib/auth";
import BagStep from "./_components/BagStep";
import AddressStep from "./_components/AddressStep";
import DeliveryStep from "./_components/DeliveryStep";
import PaymentStep from "./_components/PaymentStep";
import { useCart } from "./(hooks)/useCart";


type CartItem = CartListItem;

/* ---------------- 常量 ---------------- */
const LS_ADDRESS_KEY = "sp.checkout.address";
const DELIVERY_FREE_THRESHOLD = 100;
const DELIVERY_FLAT = 10;
const DISPLAY_CURRENCY: Currency = "AUD";
const CONFIRM_PATH = "/order/confirmation";
const LS_BILLING_ADDR = "sp.checkout.billingAddress";
const LS_SAME_AS_DELIVERY = "sp.checkout.sameAsDelivery";

/* 工具：本地 /api 优先（需要远端时单独指定） */
const apiURL = (path: string) => `/api${path}`;
const REMOTE_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

/* ---------------- 小工具 ---------------- */
function fmtPrice(n: number, currency: string, locale?: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtMoneyMinor(minor: number, currency: string, locale?: string) {
  return fmtPrice((minor ?? 0) / 100, currency, locale);
}

/* ====== 校验正则 & 工具（Address Line 2、marketing 勾选不校验） ====== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;
const POSTCODE_RE = /^[A-Za-z0-9\s\-]{3,10}$/;
const t = (s?: string) => (s || "").trim();

type Address = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  line1?: string;
  line2?: string; // optional
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type AddressErr = {
  firstName: boolean;
  lastName: boolean;
  phone: boolean;
  line1: boolean;
  city: boolean;
  state: boolean;
  postcode: boolean;
  country: boolean;
  email: boolean;
};

const emptyErr: AddressErr = {
  firstName: false,
  lastName: false,
  phone: false,
  line1: false,
  city: false,
  state: false,
  postcode: false,
  country: false,
  email: false,
};

/** 允许在“已登录或地址中已有邮箱”时不校验邮箱 */
function validateAddress(a: Address, emailInput: string, ignoreEmail = false) {
  const errs: AddressErr = {
    firstName: t(a.firstName) === "",
    lastName: t(a.lastName) === "",
    phone: !PHONE_RE.test(t(a.phone)),
    line1: t(a.line1) === "",
    city: t(a.city) === "",
    state: t(a.state) === "",
    postcode: !POSTCODE_RE.test(t(a.postcode)),
    country: t(a.country) === "",
    email: ignoreEmail ? false : !EMAIL_RE.test(t(emailInput || a.email)),
  };
  const valid = Object.values(errs).every((v) => v === false);
  return { valid, errs };
}

/* ✅ 在这里粘贴 */
function toApiAddress(a: Address) {
  return {
    first_name: (a.firstName || "").trim(),
    last_name:  (a.lastName  || "").trim(),
    phone:      (a.phone     || "").trim(),
    line1:      (a.line1     || "").trim(),
    line2:      (a.line2     || "").trim() || null,
    city:       (a.city      || "").trim(),
    state:      (a.state     || "").trim(),
    postcode:   (a.postcode  || "").trim(),
    country:    (a.country   || "").trim(),
  };
}


/** 把 /api/addresses 返回的地址转成前端 Address 结构 */
function fromApiAddress(raw: any): Address {
  if (!raw) return {};
  return {
    firstName: raw.first_name ?? "",
    lastName:  raw.last_name  ?? "",
    email:     raw.email      ?? "",
    phone:     raw.phone      ?? "",
    line1:     raw.line1      ?? raw.addr_line1 ?? "",
    line2:     raw.line2      ?? raw.addr_line2 ?? "",
    city:      raw.city       ?? raw.addr_city  ?? "",
    state:     raw.state      ?? raw.addr_state ?? "",
    postcode:  raw.postcode   ?? raw.addr_postcode ?? "",
    country:   raw.country    ?? raw.addr_country  ?? "",
  };
}

/** Billing 单字段有效性（不校验 email，line2 可空） */
function isFieldValid(k: keyof Address, v: string | undefined) {
  const s = (v ?? "").trim();
  switch (k) {
    case "line2":
      return true;                 // 可选
    case "phone":
      return PHONE_RE.test(s);
    case "postcode":
      return POSTCODE_RE.test(s);
    case "email":
      return true;                 // Billing 不用
    default:
      return s.length > 0;
  }
}

/* ---------------- Stepper ---------------- */
type StepKey = "bag" | "address" | "delivery" | "payment";
const STEP_LIST: { key: StepKey; label: string }[] = [
  { key: "bag", label: "Bag" },
  { key: "address", label: "Address" },
  { key: "delivery", label: "Delivery" },
  { key: "payment", label: "Payment" },
];
const isStepKey = (v: any): v is StepKey =>
  v === "bag" || v === "address" || v === "delivery" || v === "payment";

function CheckoutSteps({
  step,
  onChange,
}: {
  step: StepKey;
  onChange: (next: StepKey) => void;
}) {
  const currentIndex = STEP_LIST.findIndex((s) => s.key === step);
  const progress = (currentIndex / (STEP_LIST.length - 1)) * 100;

  return (
    <div className="relative pt-8 pb-10">
      <div className="absolute left-0 right-0 top-6 h-[2px] bg-neutral-200" />
      <div
        className="absolute left-0 top-6 h-[2px] bg-black transition-all"
        style={{ width: `${progress}%` }}
      />
      <div className="relative flex items-center justify-between">
        {STEP_LIST.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const isLocked = i > currentIndex; // 只能回退，不允许前进
          const baseCircle =
            "flex items-center justify-center h-8 w-8 rounded-full border text-sm";
          const circleClass = isActive
            ? "bg-black text-white border-black"
            : isDone
            ? "bg-white text-black border-black"
            : "bg-white text-neutral-400 border-neutral-300";
          const labelClass = isActive
            ? "text-black"
            : isDone
            ? "text-neutral-500"
            : "text-neutral-400";

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                if (!isLocked) onChange(s.key);
              }}
              tabIndex={isLocked ? -1 : 0}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={isLocked ? true : undefined}
              title={isLocked ? "Complete previous steps to continue" : s.label}
              className={[
                "group flex w-1/4 flex-col items-center gap-2 focus:outline-none select-none",
                isLocked ? "cursor-default opacity-50 pointer-events-auto" : "cursor-pointer",
              ].join(" ")}
            >
              <div className={`${baseCircle} ${circleClass}`}>
                {isDone ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
              </div>
              <div className={`text-sm font-medium ${labelClass}`}>{s.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Delivery ---------------- */
type DeliveryMethod = "standard" | "express";

/* ---------------- 价格工具 ---------------- */
function itemToPriceRecs(it: any): PriceRec[] {
  if (Array.isArray(it?.prices) && it.prices.length) {
    return it.prices
      .map((p: any) => {
        const currency = String(p?.currency || "").toUpperCase() as Currency;
        const amount = Math.max(0, Math.round(Number(p?.price) || 0));
        const rec: PriceRec = { currency, amount_minor: amount, price: amount };
        if (p?.discount_percent_off != null) rec.discount_percent_off = Number(p.discount_percent_off);
        if (p?.sale_starts_at) rec.sale_starts_at = String(p.sale_starts_at);
        if (p?.sale_ends_at) rec.sale_ends_at = String(p.sale_ends_at);
        return rec;
      })
      .filter((r: PriceRec) => Number.isInteger((r as any).price ?? r.amount_minor));
  }
  const currency = String(it?.currency || "AUD").toUpperCase() as Currency;
  const priceMajor = Number(it?.price) || 0;
  const baseMajor = Number(it?.basePrice ?? it?.price ?? 0);
  const priceMinor = Math.max(0, Math.round(priceMajor * 100));
  const baseMinor = Math.max(0, Math.round(baseMajor * 100));
  const base = baseMinor || priceMinor;
  const rec: PriceRec = { currency, amount_minor: base, price: base };
  if (baseMinor > priceMinor && baseMinor > 0) {
    const off = Math.round((1 - priceMinor / baseMinor) * 100);
    rec.discount_percent_off = Math.max(0, off);
  }
  return [rec];
}
const baseOf = (r: PriceRec) => Math.max(0, Number((r as any).price ?? r.amount_minor ?? 0));

/* ---------------- 大按钮 ---------------- */
function LargeBackButton({
  onClick,
  className = "",
  disabled,
}: {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full border bg-white px-6 py-3 text-sm font-semibold",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-50",
        "text-neutral-900 w-full",
        className,
      ].join(" ")}
    >
      Back
    </button>
  );
}
function LargePrimaryButton({
  onClick,
  children,
  className = "",
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full px-6 py-3 text-sm font-semibold w-full",
        disabled
          ? "bg-neutral-300 text-white cursor-not-allowed"
          : "bg-neutral-900 text-white hover:bg-neutral-800",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
function LargeGhostButton({
  onClick,
  children,
  className = "",
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full border bg-white px-6 py-3 text-sm font-semibold w-full",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-50",
        "text-neutral-900",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ========= 成功支付后把订单发送给 Worker（返回 order 对象） ========= */
async function sendOrderToServer(args: {
  cart: any[];
  address: Address;                    // 收货地址（delivery）
  currency: string;
  itemsMinor: number;
  deliveryFeeMinor: number;
  taxMinor?: number;
  grandMinor: number;
  paypalPayload: any;
  deliveryMethod?: "standard" | "express";

  // 账单地址相关（可选）
  billingAddress?: Address | null;
  sameAsDelivery?: boolean;            // true = 同收货地址
}): Promise<{ ok: boolean; order?: { id: number; order_number: string | null } }> {
  try {
    const target = "/api/orders";

    // ① 计算每一行条目（与后端字段对齐）
    const items = (args.cart || []).map((it: any) => {
      const recs = itemToPriceRecs(it);
      const rec = recs.find((r) => r.currency === (args.currency as Currency));
      const unitMinor = rec ? effectiveMinor(rec) : Math.round(Number(it?.price || 0) * 100);
      const qty = Math.max(1, Number(it?.qty) || 1);
      const lineMinor = unitMinor * qty;

      return {
        product_id: it?.id ?? null,
        product_sku: it?.sku ?? null,
        product_title: String(it?.title || it?.name || "Item"),
        variant_title:
          it?.variant || [it?.color, it?.size].filter(Boolean).join(" / ") || null,
        qty,
        currency: args.currency,
        unit_price_minor: unitMinor,
        line_total_minor: lineMinor,
        discount_minor: 0,
        tax_minor: 0,
        snapshot: {
          slug: it?.slug ?? null,
          image: it?.image || it?.img || null,
          attrs: {
            color: it?.color ?? null,
            size: it?.size ?? null,
            ...(it?.attrs || {}),
          },
        },
      };
    });

    // ② PayPal 交易号尽量稳健地提取
    const cap =
      args.paypalPayload?.purchase_units?.[0]?.payments?.captures?.[0] ||
      args.paypalPayload?.transaction ||
      null;
    const txnId =
      cap?.id ||
      args.paypalPayload?.id ||
      args.paypalPayload?.paypalTransactionId ||
      null;

    // ③ 计算账单地址：同收货地址 or 独立账单地址（只用来放到 meta 里，不顶层发给后端）
    const billing =
      (args.sameAsDelivery ? args.address : (args.billingAddress || args.address)) || {};

    const billingMeta = {
      first_name: billing.firstName || null,
      last_name: billing.lastName || null,
      email: (billing.email || "").trim() || null,
      phone: billing.phone || null,
      line1: billing.line1 || null,
      line2: billing.line2 || null,
      city: billing.city || null,
      state: billing.state || null,
      postcode: billing.postcode || null,
      country: billing.country || null,
      same_as_delivery: !!args.sameAsDelivery,
    };

    // ④ 组装请求体（⚠️ 不再有顶层 billing_address 字段，保持兼容）
    const body = {
      // —— 顾客 / 收货信息（delivery） —— 这些字段保持和你原来的 Worker 一致
      email: (args.address?.email || "").trim() || "",
      first_name: args.address?.firstName || null,
      last_name: args.address?.lastName || null,
      phone: args.address?.phone || null,
      addr_line1: args.address?.line1 || null,
      addr_line2: args.address?.line2 || null,
      addr_city: args.address?.city || null,
      addr_state: args.address?.state || null,
      addr_postcode: args.address?.postcode || null,
      addr_country: args.address?.country || null,

      // —— 金额相关 —— 
      currency: args.currency,
      items_total_minor: Number(args.itemsMinor) || 0,
      delivery_fee_minor: Number(args.deliveryFeeMinor) || 0,
      discount_minor: 0,
      tax_minor: Number(args.taxMinor || 0),
      grand_total_minor: Number(args.grandMinor) || 0,

      // —— 其他 —— 
      delivery_method: args.deliveryMethod ?? "standard",
      items,

      payment: {
        provider: "paypal",
        provider_txn_id: txnId,
        amount_minor: Number(args.grandMinor) || 0,
        currency: args.currency,
        status: "captured",
        captured_at: Math.floor(Date.now() / 1000),
        raw: args.paypalPayload || null,
      },

      // ⚠️ 这里把账单地址塞进 meta，后端一般会当作 JSON 存下来，不会报 schema 错
      meta: {
        step: "payment",
        path: "/checkout",
        billing_address: billingMeta,
      },

      notes: null,
    };

    // ⑤ 发起请求
    const res = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(body),
    });

    // ⑥ 解析响应
    let data: any = null;
    let text: string | null = null;
    try {
      data = await res.clone().json();
    } catch {
      try {
        text = await res.text();
      } catch {}
    }

    if (res.ok && data?.ok && data?.order && typeof data.order.id === "number") {
      return {
        ok: true,
        order: {
          id: data.order.id,
          order_number: data.order.order_number ?? null,
        },
      };
    }

    // 这里可以改成 warn，这样 console 不会出现红色 error，但还是能看到信息
    console.warn("[orders] server error:", { status: res.status, data, text });
    return { ok: false };
  } catch (e) {
    console.warn("[orders] persist error:", e);
    return { ok: false };
  }
}

/* ---------------- Page ---------------- */
export default function CheckoutPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { cart, setCart, itemsCount, hasItems, clearCart } = useCart();
  const [address, setAddress] = useState<Address>({});
  
  // Billing 地址与“同收货地址”开关  ←← 在这里插入
  const [billingAddress, setBillingAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
  });
  const [sameAsDelivery, setSameAsDelivery] = useState<boolean>(false);
  // 新增：控制是否使用已保存的地址
  const [useSavedDelivery, setUseSavedDelivery] = useState(false);
  const [useSavedBilling, setUseSavedBilling] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("standard");
  const [isPayProcessing, setIsPayProcessing] = useState(false);   // ✅ 是否正在处理支付

  // 服务器端是否存在保存的默认地址（登录用户）
  const [hasSavedDelivery, setHasSavedDelivery] = useState(false);
  const [hasSavedBilling,  setHasSavedBilling]  = useState(false);

  // 取回来的默认地址（用于一键回填）
  const [savedDeliveryAddr, setSavedDeliveryAddr] = useState<Address | null>(null);
  const [savedBillingAddr,  setSavedBillingAddr]  = useState<Address | null>(null);

    

  // 勾选 & 邮箱本地状态
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [emailInput, setEmailInput] = useState<string>("");

  // 登录态（读取 presence/session cookie）
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const readLoginFromCookie = () => {
    const has = isLoggedInViaCookie();
    setIsLoggedIn(has);
  };

  // 地址校验状态（用于 Continue 按钮的显错）
  const [addressShowErrors, setAddressShowErrors] = useState(false);
  const [addressErrs, setAddressErrs] = useState<AddressErr>(emptyErr);
  const [billingErrs, setBillingErrs] = useState<AddressErr>(emptyErr);


  // 提供给 AddressStep，用来一键清空错误状态
  const clearAddressErrors = () => {
    setAddressShowErrors(false);
    setAddressErrs(emptyErr);
  };
  const clearBillingErrors = () => {
    setBillingErrs(emptyErr);
  };


  // ✅ 就在这里粘贴 ↓↓↓
  // Billing 字段实时清错：输入后若该字段有效，立刻把对应错误位清除
  function handleBillingFieldChange(k: keyof Address, v: string) {
    const ok = isFieldValid(k, v);        // isFieldValid 定义在组件外面即可
    setBillingErrs(prev => {
      const next = { ...prev };
      if (k === "firstName") next.firstName = !ok;
      else if (k === "lastName") next.lastName = !ok;
      else if (k === "phone") next.phone = !ok;
      else if (k === "line1") next.line1 = !ok;
      else if (k === "city") next.city = !ok;
      else if (k === "state") next.state = !ok;
      else if (k === "postcode") next.postcode = !ok;
      else if (k === "country") next.country = !ok;
      // email / line2 不参与
      return next;
    });
  }
  // ✅ 到此为止 ↑↑↑


  // 保存默认地址提示（点击保存后才可能出现）
  const [saveMsg, setSaveMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  // ✅ 新增：Continue 按钮下方的错误提示
  const [continueErrMsg, setContinueErrMsg] = useState<string | null>(null);

  // URL 步骤
  const initialStepFromURL = (() => {
    const s = searchParams.get("step");
    return isStepKey(s) ? (s as StepKey) : ("bag" as StepKey);
  })();
  const [step, setStep] = useState<StepKey>(initialStepFromURL);

  const setStepAndURL = (next: StepKey) => {
    setStep(next);
    const p = new URLSearchParams(window.location.search);
    p.set("step", next);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // 预连接
  useEffect(() => {
    const hosts = [
      "https://www.paypal.com",
      "https://www.paypalobjects.com",
      "https://assets.braintreegateway.com",
      "https://client-analytics.braintreegateway.com",
    ];
    hosts.forEach((h) => {
      if (!document.querySelector(`link[rel="preconnect"][href="${h}"]`)) {
        const pre = document.createElement("link");
        pre.rel = "preconnect";
        pre.href = h;
        pre.crossOrigin = "anonymous";
        document.head.appendChild(pre);
      }
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${h}"]`)) {
        const dns = document.createElement("link");
        dns.rel = "dns-prefetch";
        dns.href = h;
        document.head.appendChild(dns);
      }
    });
  }, []);

  // 初始化本地缓存 & 登录态 & 回填邮箱
  useEffect(() => {
    try {
      const rawAddr = localStorage.getItem(LS_ADDRESS_KEY);
      if (rawAddr) {
        const a = JSON.parse(rawAddr);
        setAddress(a);
        setEmailInput(a?.email || "");
      }
    } catch {}
    // 读取 Billing 地址 & “同收货地址”开关
    try {
      const rawBilling = localStorage.getItem(LS_BILLING_ADDR);
      if (rawBilling) setBillingAddress(JSON.parse(rawBilling));
      const rawSame = localStorage.getItem(LS_SAME_AS_DELIVERY);
      if (rawSame) setSameAsDelivery(JSON.parse(rawSame));
    } catch {}

    readLoginFromCookie();

    (async () => {
      if (isLoggedInViaCookie()) {
        const authedEmail = await fetchAuthedEmail();
        if (authedEmail) {
          setEmailInput((prev) => prev || authedEmail);
          setAddress((a) => {
            if (a.email) return a;
            const next = { ...a, email: authedEmail };
            try {
              localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }
    })();

    window.addEventListener("focus", readLoginFromCookie);
    return () => window.removeEventListener("focus", readLoginFromCookie);
  }, []);

  useEffect(() => {
  // 仅已登录才请求 /api/addresses
  if (!isLoggedInViaCookie()) {
    setHasSavedDelivery(false);
    setHasSavedBilling(false);
    setSavedDeliveryAddr(null);
    setSavedBillingAddr(null);
    return;
  }

  let dead = false;
  (async () => {
    try {
      const r = await fetch("/api/addresses", {
        method: "GET",
        credentials: "include",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!r.ok) return;
      const data = await r.json().catch(() => ({}));
      if (dead) return;

      const d = data?.delivery || null;
      const b = data?.billing  || null;

      const fd = d ? fromApiAddress(d) : null;
      const fb = b ? fromApiAddress(b) : null;

      setHasSavedDelivery(!!fd);
      setHasSavedBilling(!!fb);
      setSavedDeliveryAddr(fd);
      setSavedBillingAddr(fb);
    } catch {}
  })();

  return () => { dead = true; };
}, [isLoggedIn]); // 登录状态变化时重新拉取

  // 勾选“同收货地址”时，实时用 delivery 覆盖 billing
  useEffect(() => {
    if (sameAsDelivery) {
      setBillingErrs(emptyErr);   // 隐藏时顺便清空错误
    }
  }, [sameAsDelivery]);

  // 将 billingAddress 和 sameAsDelivery 写回本地存储
  useEffect(() => {
    try {
      localStorage.setItem(LS_BILLING_ADDR, JSON.stringify(billingAddress));
      localStorage.setItem(LS_SAME_AS_DELIVERY, JSON.stringify(sameAsDelivery));
    } catch {}
  }, [billingAddress, sameAsDelivery]);

  // 地址写回：每次地址变化清空保存提示
  useEffect(() => {
    try {
      localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(address));
    } catch {}
    setSaveMsg(null);
  }, [address]);

  // 统一用 AUD 计算与展示
  const pricingInput = useMemo(
    () => cart.map((it: any) => ({ qty: Number(it?.qty) || 1, prices: itemToPriceRecs(it) })), [cart]
  );

  const itemsTotals = useMemo(() => {
    if (!pricingInput.length)
      return { currency: DISPLAY_CURRENCY as Currency, itemsMinor: 0, itemsMajor: 0 };
    const { currency, totalMinor, totalMajor } = selectCurrencyAndTotals(
      pricingInput,
      DISPLAY_CURRENCY,
      undefined,
      DISPLAY_CURRENCY
    );
    return { currency, itemsMinor: totalMinor, itemsMajor: totalMajor };
  }, [pricingInput]);

  const currency = DISPLAY_CURRENCY as string;

  const savedMajor = useMemo(() => {
    let savedMinor = 0;
    for (const it of cart as any[]) {
      const qty = Number(it?.qty) || 1;
      const recs = itemToPriceRecs(it);
      const rec = recs.find((r) => r.currency === (currency as Currency));
      if (rec) {
        const base = baseOf(rec);
        const eff = effectiveMinor(rec);
        if (eff < base) savedMinor += (base - eff) * qty;
      } else {
        const baseMajor = Number(it?.basePrice ?? it?.price ?? 0);
        const priceMajor = Number(it?.price ?? 0);
        if (baseMajor > priceMajor) savedMinor += Math.round((baseMajor - priceMajor) * 100) * qty;
      }
    }
    return savedMinor / 100;
  }, [cart, currency]);

  // 运费 & 总计
  const deliveryFeeMajor =
    hasItems && itemsTotals.itemsMajor < DELIVERY_FREE_THRESHOLD ? DELIVERY_FLAT : 0;
  const deliveryFeeMinor = Math.round(deliveryFeeMajor * 100);
  const totalMinor = itemsTotals.itemsMinor + deliveryFeeMinor;
  const totalMajor = itemsTotals.itemsMajor + deliveryFeeMajor;
  const amountInMajorUnit = Math.max(0, Number(totalMajor.toFixed(2)));

  const nextStepCore = () => {
    setStepAndURL(step === "bag" ? "address" : step === "address" ? "delivery" : "payment");
  };
  const prevStep = () => {
    setStepAndURL(step === "payment" ? "delivery" : step === "delivery" ? "address" : "bag");
  };

  // ---------- 时区标记 ----------
  const clientTZ =
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  const clientUTCOffsetMin = -new Date().getTimezoneOffset();
  const FORCE_CN_TZ = "Asia/Shanghai";

  // 订阅（未登录仍允许；已登录隐藏 Your Details 时基本不会触发）
  async function sendSubscriptionIfNeeded(emailRaw?: string) {
    try {
      const email = (emailRaw || address?.email || "").trim().toLowerCase();
      if (!email) return;

      const payload = {
        email,
        marketing_opt_in: !!marketingOptIn,
        source: "checkout",
        tz: FORCE_CN_TZ,
        meta: {
          path: "/checkout",
          step,
          ts: Date.now(),
          tz: FORCE_CN_TZ,
          client_tz: clientTZ,
          utc_offset_min: clientUTCOffsetMin,
        },
      };

      const jsonBlob = new Blob([JSON.stringify(payload)], { type: "application/json" });

      if (REMOTE_BASE) {
        const ok = typeof navigator !== "undefined" && navigator.sendBeacon?.(`${REMOTE_BASE}/subscribe`, jsonBlob);
        if (ok) return;
      }
      const okLocal = typeof navigator !== "undefined" && navigator.sendBeacon?.(apiURL("/subscribe"), jsonBlob);
      if (okLocal) return;

      setTimeout(() => {
        const target = REMOTE_BASE ? `${REMOTE_BASE}/subscribe` : apiURL("/subscribe");
        fetch(target, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }, 0);
    } catch {}
  }

  // 保存为默认地址：按钮可点，点击时才校验 & 提示
  // ✨ 替换整段函数：仅保存需要保存的那一侧；避免误改另一侧
  const handleSaveDefaultAddress = async () => {
    // 计算三种保存意图：
    // A) 只保存 Delivery（勾了 useSavedBilling）
    // B) 只保存 Billing（勾了 useSavedDelivery）
    // C) 同时保存两者 / 或 sameAsDelivery 情况
    const saveDeliveryOnly = !useSavedDelivery && useSavedBilling;
    const saveBillingOnly  =  useSavedDelivery && !useSavedBilling;
    const saveBothOrSame   = !useSavedDelivery && !useSavedBilling; // 两侧都不是“用已保存”，说明两侧都在你手里

    // 1) 校验：只校验需要编辑/保存的那一侧
    if (saveDeliveryOnly || saveBothOrSame) {
      const { valid, errs } = validateAddress(address, "", true);
      if (!valid) {
        setAddressErrs(errs);
        setAddressShowErrors(true);
        setSaveMsg({ kind: "error", text: "Please complete all required delivery address fields before saving." });
        document.getElementById("address-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    if (saveBillingOnly || (saveBothOrSame && !sameAsDelivery)) {
      const { valid, errs } = validateAddress(billingAddress, "", true);
      setBillingErrs(errs);
      if (!valid) {
        setSaveMsg({ kind: "error", text: "Please complete all required billing address fields before saving." });
        document.getElementById("billing-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    // 2) 组装 payload：严格只发需要保存的字段
    let payload: any = {};

    if (saveDeliveryOnly) {
      // 只更新 Delivery；不带 same_as_delivery，避免覆盖 Billing
      payload = { delivery: toApiAddress(address) };
    } else if (saveBillingOnly) {
      // 只更新 Billing；不带 Delivery，避免覆盖 Delivery
      payload = { billing: toApiAddress(billingAddress) };
    } else {
      // 两侧都在编辑区里：
      // - 如果 sameAsDelivery=true，则更新 delivery 并附 same_as_delivery 让后端同步到 billing
      // - 如果 sameAsDelivery=false，则两份都各自保存
      if (sameAsDelivery) {
        payload = { delivery: toApiAddress(address), same_as_delivery: true };
      } else {
        payload = { delivery: toApiAddress(address), billing: toApiAddress(billingAddress) };
      }
    }

    try {
      const res = await fetch(apiURL("/addresses"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try { data = await res.clone().json(); } catch {}

      if (!res.ok) {
        if (res.status === 401) {
          try {
            const who = await fetch("/api/__whoami?debug=1", {
              credentials: "include",
              headers: { accept: "application/json" },
            }).then(r => r.json());
            const reason = who?.diag?.reason || "UNKNOWN";
            const cookies = JSON.stringify(who?.diag?.cookie_present || {});
            setSaveMsg({ kind: "error", text: `Unauthorized (401). reason=${reason}; cookies=${cookies}` });
          } catch {
            setSaveMsg({ kind: "error", text: "Unauthorized (401)" });
          }
        } else {
          const msg = data?.error || data?.message || `HTTP ${res.status}`;
          setSaveMsg({ kind: "error", text: msg });
        }
        return;
      }

      setSaveMsg({ kind: "success", text: "Saved as your default address." });
    } catch (e: any) {
      setSaveMsg({ kind: "error", text: e?.message || "Failed to save address" });
    }
  };

  // 点击 Continue：Address 步骤改为“提交时校验”
  const handleContinue = () => {
    if (step === "address") {
      const ignoreEmail = isLoggedIn || !!(address.email && address.email.trim());
      const deliveryRes = validateAddress(address, "", ignoreEmail);
      const billingRes = sameAsDelivery
        ? { valid: true, errs: emptyErr }
        : validateAddress(billingAddress, "", true);

      setAddressErrs(deliveryRes.errs);
      setBillingErrs(billingRes.errs);

      if (!deliveryRes.valid || !billingRes.valid) {
        setAddressShowErrors(true);

        // ✅ 新增：给 Continue 区域也放同款文案
        setContinueErrMsg("Please complete all required delivery address fields before saving.");

        const el = document.getElementById("address-section");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      // ✅ 通过校验后清空
      setContinueErrMsg(null);

      setAddressShowErrors(false);
      setAddressErrs(emptyErr);
      setBillingErrs(emptyErr);

      if (!isLoggedIn) void sendSubscriptionIfNeeded();
    }
    nextStepCore();
  };

  // 支付成功 → 落库（拿到 order_number）→ 预览 → 清空购物车 → 跳转确认页
  const handlePaySucceeded = async (payload?: any) => {
    setIsPayProcessing(true);   // ✅ 标记：支付已成功，正在处理后续逻辑
    let orderId: number | null = null;
    let orderNumber: string | null = null;

    // 若已登录但地址里没有邮箱，则用 /auth/me 的邮箱兜底
    let orderAddress = { ...address };
    if ((!orderAddress.email || !EMAIL_RE.test((orderAddress.email || "").trim())) && isLoggedIn) {
      const authedEmail = await fetchAuthedEmail();
      if (authedEmail) {
        orderAddress.email = authedEmail;
        setAddress(orderAddress);
        setEmailInput((prev) => prev || authedEmail);
        try { localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(orderAddress)); } catch {}
      }
    }

    // 1) 持久化订单（后端会生成 order_number）
    try {
      const persist = await sendOrderToServer({
        cart,
        address: orderAddress,
        currency,
        itemsMinor: itemsTotals.itemsMinor,
        deliveryFeeMinor: deliveryFeeMinor,
        taxMinor: 0,
        grandMinor: totalMinor,
        paypalPayload: payload,
        deliveryMethod,

        // ★ 新增 ↓
        billingAddress,          // 你在页面 state 里已有
        sameAsDelivery,          // 你在页面 state 里已有
      });
      if (persist.ok && persist.order) {
        orderId = persist.order.id ?? null;
        orderNumber = persist.order.order_number ?? null;
      }
    } catch (e) {
      console.warn("[checkout] /orders persist failed (will continue to confirmation)", e);
    }

    // 2) 把关键信息塞入 sessionStorage，供 /order/confirmation 展示
    try {
      sessionStorage.setItem(
        "last-order-preview",
        JSON.stringify({
          ts: Date.now(),
          orderId,
          orderNumber,      // ✅ 新增：前端确认页可以优先显示业务单号
          currency,
          totalMinor,
          items: cart,
          address: orderAddress,
          deliveryMethod,
          payload: payload ?? null,
        })
      );
    } catch {}


    // 3) 清空购物车（用 hook 提供的方法）
    clearCart();

    // 4) 发送订阅并跳转确认页
    sendSubscriptionIfNeeded().finally(() => {
      router.push(CONFIRM_PATH);
    });
  };

  const handlePayInitiated = () => {
    void sendSubscriptionIfNeeded();
  };

  // 登录 / 注册并继续
  const handleLoginAndContinue = () => {
    const next = "/checkout?step=address";
    router.push(`/auth/login?next=${encodeURIComponent(next)}`);
  };

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 md:py-8">
      <div className="mx-auto w-full max-w-[2300px]">
        <div className="mb-5 text-sm text-neutral-600">
          <Link href="/" className="hover:underline">&larr; Back</Link>
        </div>

        <CheckoutSteps step={step} onChange={setStepAndURL} />

        <div className="space-y-6">
          {/* Bag */}
          {step === "bag" && (
            <BagStep
              cart={cart}
              setCart={setCart}
              currency={currency}
              itemsMajor={itemsTotals.itemsMajor}
              savedMajor={savedMajor}
              hasItems={hasItems}
              deliveryThreshold={DELIVERY_FREE_THRESHOLD}
              deliveryFlat={DELIVERY_FLAT}
              amountInMajorUnit={amountInMajorUnit}
            />
          )}

          {/* Address */}
          {step === "address" && (
            <AddressStep
              isLoggedIn={isLoggedIn}
              address={address}
              setAddress={setAddress}
              billingAddress={billingAddress}
              setBillingAddress={setBillingAddress}
              sameAsDelivery={sameAsDelivery}
              setSameAsDelivery={setSameAsDelivery}
              hasSavedDelivery={hasSavedDelivery}
              hasSavedBilling={hasSavedBilling}
              savedDeliveryAddr={savedDeliveryAddr}
              savedBillingAddr={savedBillingAddr}
              useSavedDelivery={useSavedDelivery}
              setUseSavedDelivery={setUseSavedDelivery}
              useSavedBilling={useSavedBilling}
              setUseSavedBilling={setUseSavedBilling}
              addressShowErrors={addressShowErrors}
              addressErrs={addressErrs}
              billingErrs={billingErrs}
              handleBillingFieldChange={handleBillingFieldChange}
              clearAddressErrors={clearAddressErrors}
              clearBillingErrors={clearBillingErrors}
              saveMsg={saveMsg}
              onSaveDefault={handleSaveDefaultAddress}
              marketingOptIn={marketingOptIn}
              setMarketingOptIn={setMarketingOptIn}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              sendSubscriptionIfNeeded={sendSubscriptionIfNeeded}
            />
          )}

          {/* Delivery */}
          {step === "delivery" && (
            <DeliveryStep
              deliveryMethod={deliveryMethod}
              setDeliveryMethod={setDeliveryMethod}
              showFreeShipping={
                hasItems && itemsTotals.itemsMajor >= DELIVERY_FREE_THRESHOLD
              }
            />
          )}

          {/* Payment（始终挂载，由 PaymentStep 自己决定显示 / 隐藏） */}
          <PaymentStep
            visible={step === "payment"}
            amountInMajorUnit={amountInMajorUnit}
            isPayProcessing={isPayProcessing}
            address={address}
            itemsCount={itemsCount}
            itemsMinor={itemsTotals.itemsMinor}
            deliveryFeeMinor={deliveryFeeMinor}
            totalMinor={totalMinor}
            currency={currency}
            onPayInitiated={handlePayInitiated}
            onPaySucceeded={handlePaySucceeded}
          />

          {/* Back 按钮（只在 payment 步骤显示） */}
          {step === "payment" && (
            <div className="px-4 pb-4 pt-2 flex justify-end">
              <div className="w-[320px] max-w-full">
                <LargeBackButton onClick={() => setStepAndURL("delivery")} />
              </div>
            </div>
          )}
        </div>

        {/* 底部操作条 */}
        {step !== "payment" && (
          <>
            <div className="mt-6 flex justify-end">
              {step === "bag" ? (
                <div className={isLoggedIn ? "w-[320px] max-w-full" : "w-[660px] max-w-full flex gap-3 justify-end"}>
                  {!isLoggedIn && (
                    <div className="w-[320px]">
                      <LargeGhostButton onClick={handleLoginAndContinue}>
                        Login / Sign up and Continue
                      </LargeGhostButton>
                    </div>
                  )}
                  <div className="w-[320px]">
                    <LargePrimaryButton onClick={handleContinue}>Continue</LargePrimaryButton>
                  </div>
                </div>
              ) : (
                <div className="w-[660px] max-w-full flex gap-3 justify-end">
                  <LargeBackButton onClick={prevStep} />
                  <LargePrimaryButton onClick={handleContinue}>
                    Continue
                  </LargePrimaryButton>
                </div>
              )}
            </div>

            {/* ✅ Address 步骤 Continue 按钮下方的错误提示 */}
            {step === "address" && continueErrMsg && (
              <div className="mt-2 flex justify-end">
                <div className="w-[660px] max-w-full text-right">
                  <p className="text-xs text-red-600">{continueErrMsg}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ---------------- 行组件 ---------------- */
function Row({
  label,
  value,
  strongLeft,
  strongRight,
  bigRight,
  valueClass,
}: {
  label: string;
  value: string;
  strongLeft?: boolean;
  strongRight?: boolean;
  bigRight?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className={[strongLeft ? "font-semibold" : "text-neutral-600"].join(" ")}>{label}</div>
      <div
        className={[
          strongRight ? "font-semibold" : "",
          bigRight ? "text-lg" : "text-base",
          valueClass || "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}
