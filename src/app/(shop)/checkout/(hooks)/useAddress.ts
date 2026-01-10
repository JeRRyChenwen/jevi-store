// src/app/checkout/(hooks)/useAddress.ts
"use client";

import { useEffect, useState } from "react";

/* ====== 正则与小工具 ====== */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;
const POSTCODE_RE = /^[A-Za-z0-9\s\-]{3,10}$/;

const t = (s?: string) => (s || "").trim();

/* ====== localStorage key（和 page.tsx 中保持一致） ====== */
const LS_ADDRESS_KEY = "sp.checkout.address";
const LS_BILLING_ADDR = "sp.checkout.billingAddress";
const LS_SAME_AS_DELIVERY = "sp.checkout.sameAsDelivery";

/* ====== /api 工具 ====== */
const apiURL = (path: string) => `/api${path}`;

/* ====== 类型 ====== */
export type Address = {
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

export type AddressErr = {
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

export const emptyErr: AddressErr = {
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
export function validateAddress(
  a: Address,
  emailInput: string,
  ignoreEmail = false
) {
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

/** 把前端 Address 转成 /api/addresses 需要的 payload */
export function toApiAddress(a: Address) {
  return {
    first_name: (a.firstName || "").trim(),
    last_name: (a.lastName || "").trim(),
    phone: (a.phone || "").trim(),
    line1: (a.line1 || "").trim(),
    line2: (a.line2 || "").trim() || null,
    city: (a.city || "").trim(),
    state: (a.state || "").trim(),
    postcode: (a.postcode || "").trim(),
    country: (a.country || "").trim(),
  };
}

/** 把 /api/addresses 返回的地址转成前端 Address 结构 */
export function fromApiAddress(raw: any): Address {
  if (!raw) return {};
  return {
    firstName: raw.first_name ?? "",
    lastName: raw.last_name ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    line1: raw.line1 ?? raw.addr_line1 ?? "",
    line2: raw.line2 ?? raw.addr_line2 ?? "",
    city: raw.city ?? raw.addr_city ?? "",
    state: raw.state ?? raw.addr_state ?? "",
    postcode: raw.postcode ?? raw.addr_postcode ?? "",
    country: raw.country ?? raw.addr_country ?? "",
  };
}

/** Billing 单字段有效性（不校验 email，line2 可空） */
export function isFieldValid(k: keyof Address, v: string | undefined) {
  const s = (v ?? "").trim();
  switch (k) {
    case "line2":
      return true; // 可选
    case "phone":
      return PHONE_RE.test(s);
    case "postcode":
      return POSTCODE_RE.test(s);
    case "email":
      return true; // Billing 不用
    default:
      return s.length > 0;
  }
}

/* ========= 真正的 useAddress Hook ========= */

type SaveMsg = { kind: "error" | "success"; text: string } | null;

export function useAddress(isLoggedIn: boolean) {
  // 基础地址状态
  const [address, setAddress] = useState<Address>({});
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

  // 是否使用已保存的地址（AddressStep 上面的两个开关）
  const [useSavedDelivery, setUseSavedDelivery] = useState(false);
  const [useSavedBilling, setUseSavedBilling] = useState(false);

  // 服务器端是否有默认地址 + 拉回来的数据
  const [hasSavedDelivery, setHasSavedDelivery] = useState(false);
  const [hasSavedBilling, setHasSavedBilling] = useState(false);
  const [savedDeliveryAddr, setSavedDeliveryAddr] =
    useState<Address | null>(null);
  const [savedBillingAddr, setSavedBillingAddr] =
    useState<Address | null>(null);

  // 校验错误状态
  const [addressShowErrors, setAddressShowErrors] = useState(false);
  const [addressErrs, setAddressErrs] = useState<AddressErr>(emptyErr);
  const [billingErrs, setBillingErrs] = useState<AddressErr>(emptyErr);

  // 保存默认地址提示
  const [saveMsg, setSaveMsg] = useState<SaveMsg>(null);

  // Continue 按钮下方的提示
  const [continueErrMsg, setContinueErrMsg] = useState<string | null>(null);

  /* ---------- 工具函数：清空错误 ---------- */
  const clearAddressErrors = () => {
    setAddressShowErrors(false);
    setAddressErrs(emptyErr);
  };
  const clearBillingErrors = () => {
    setBillingErrs(emptyErr);
  };

  /* ---------- Billing 字段实时清错 ---------- */
  function handleBillingFieldChange(k: keyof Address, v: string) {
    const ok = isFieldValid(k, v);
    setBillingErrs((prev) => {
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

  /* ---------- 初始：从 localStorage 回填 ---------- */
  useEffect(() => {
    try {
      const rawAddr = localStorage.getItem(LS_ADDRESS_KEY);
      if (rawAddr) {
        const a = JSON.parse(rawAddr);
        setAddress(a);
      }
    } catch {}

    try {
      const rawBilling = localStorage.getItem(LS_BILLING_ADDR);
      if (rawBilling) setBillingAddress(JSON.parse(rawBilling));
      const rawSame = localStorage.getItem(LS_SAME_AS_DELIVERY);
      if (rawSame) setSameAsDelivery(JSON.parse(rawSame));
    } catch {}
  }, []);

  /* ---------- 登录状态变化时：请求 /api/addresses ---------- */
  useEffect(() => {
    if (!isLoggedIn) {
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

        // 这里不要静默 return，否则你“看不到报错”，但其实已经失败了
        const data = await r.json().catch(() => ({}));

        if (dead) return;

        if (!r.ok) {
          // 让问题可见：至少在 console 里能看到是什么状态码/返回
          console.error("[useAddress] GET /api/addresses failed:", r.status, data);
          setHasSavedDelivery(false);
          setHasSavedBilling(false);
          setSavedDeliveryAddr(null);
          setSavedBillingAddr(null);
          return;
        }

        // ✅ 兼容两种后端返回：
        // A) 新版：{ ok:true, addresses:{ delivery, billing } }
        // B) 旧版：{ ok:true, delivery, billing }
        const d = data?.addresses?.delivery ?? data?.delivery ?? null;
        const b = data?.addresses?.billing ?? data?.billing ?? null;

        const fd = d ? fromApiAddress(d) : null;
        const fb = b ? fromApiAddress(b) : null;

        setHasSavedDelivery(!!fd);
        setHasSavedBilling(!!fb);
        setSavedDeliveryAddr(fd);
        setSavedBillingAddr(fb);
      } catch (e: any) {
        if (dead) return;
        console.error("[useAddress] GET /api/addresses exception:", e?.message || e);
        setHasSavedDelivery(false);
        setHasSavedBilling(false);
        setSavedDeliveryAddr(null);
        setSavedBillingAddr(null);
      }
    })();

    return () => {
      dead = true;
    };
  }, [isLoggedIn]);

  /* ---------- 勾选“同收货地址”时：清空 Billing 错误 ---------- */
  useEffect(() => {
    if (sameAsDelivery) {
      setBillingErrs(emptyErr);
    }
  }, [sameAsDelivery]);

  /* ---------- 将 Billing & sameAsDelivery 写回 localStorage ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(LS_BILLING_ADDR, JSON.stringify(billingAddress));
      localStorage.setItem(LS_SAME_AS_DELIVERY, JSON.stringify(sameAsDelivery));
    } catch {}
  }, [billingAddress, sameAsDelivery]);

  /* ---------- 地址写回 localStorage + 清除保存提示 ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(LS_ADDRESS_KEY, JSON.stringify(address));
    } catch {}
    setSaveMsg(null);
  }, [address]);

  /* ---------- 保存默认地址 ---------- */
  const handleSaveDefaultAddress = async () => {
    // 计算三种保存意图：
    // A) 只保存 Delivery（勾了 useSavedBilling）
    // B) 只保存 Billing（勾了 useSavedDelivery）
    // C) 同时保存两者 / 或 sameAsDelivery 情况
    const saveDeliveryOnly = !useSavedDelivery && useSavedBilling;
    const saveBillingOnly = useSavedDelivery && !useSavedBilling;
    const saveBothOrSame = !useSavedDelivery && !useSavedBilling;

    // 1) 校验：只校验需要编辑/保存的那一侧
    if (saveDeliveryOnly || saveBothOrSame) {
      const { valid, errs } = validateAddress(address, "", true);
      if (!valid) {
        setAddressErrs(errs);
        setAddressShowErrors(true);
        setSaveMsg({
          kind: "error",
          text: "Please complete all required delivery address fields before saving.",
        });
        document
          .getElementById("address-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    if (saveBillingOnly || (saveBothOrSame && !sameAsDelivery)) {
      const { valid, errs } = validateAddress(billingAddress, "", true);
      setBillingErrs(errs);
      if (!valid) {
        setSaveMsg({
          kind: "error",
          text: "Please complete all required billing address fields before saving.",
        });
        document
          .getElementById("billing-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    // 2) 组装 payload
    let payload: any = {};

    if (saveDeliveryOnly) {
      payload = { delivery: toApiAddress(address) };
    } else if (saveBillingOnly) {
      payload = { billing: toApiAddress(billingAddress) };
    } else {
      if (sameAsDelivery) {
        payload = { delivery: toApiAddress(address), same_as_delivery: true };
      } else {
        payload = {
          delivery: toApiAddress(address),
          billing: toApiAddress(billingAddress),
        };
      }
    }

    // 3) 发送请求
    try {
      const res = await fetch(apiURL("/addresses"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await res.clone().json();
      } catch {}

      if (!res.ok) {
        if (res.status === 401) {
          try {
            const who = await fetch("/api/__whoami?debug=1", {
              credentials: "include",
              headers: { accept: "application/json" },
            }).then((r) => r.json());
            const reason = who?.diag?.reason || "UNKNOWN";
            const cookies = JSON.stringify(
              who?.diag?.cookie_present || {}
            );
            setSaveMsg({
              kind: "error",
              text: `Unauthorized (401). reason=${reason}; cookies=${cookies}`,
            });
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
      setSaveMsg({
        kind: "error",
        text: e?.message || "Failed to save address",
      });
    }
  };

  return {
    // state
    address,
    setAddress,
    billingAddress,
    setBillingAddress,
    sameAsDelivery,
    setSameAsDelivery,
    useSavedDelivery,
    setUseSavedDelivery,
    useSavedBilling,
    setUseSavedBilling,
    hasSavedDelivery,
    hasSavedBilling,
    savedDeliveryAddr,
    savedBillingAddr,
    addressShowErrors,
    setAddressShowErrors,
    addressErrs,
    setAddressErrs,
    billingErrs,
    setBillingErrs,
    saveMsg,
    setSaveMsg,
    continueErrMsg,
    setContinueErrMsg,

    // helpers
    clearAddressErrors,
    clearBillingErrors,
    handleBillingFieldChange,
    handleSaveDefaultAddress,
  };
}
