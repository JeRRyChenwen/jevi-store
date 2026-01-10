// src/app/profile/EditAddressCard.tsx
"use client";

import { useEffect, useState } from "react";

type Address = {
  first_name: string;
  last_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  is_default?: boolean | number | null;
};

type AddressesResp = {
  ok: boolean;

  // ✅ 新结构：Worker 返回 { addresses: { delivery, billing } }
  addresses?: {
    delivery?: any | null;
    billing?: any | null;
  };

  // ✅ 兼容旧结构（如果你哪天又改回去，也不炸）
  delivery?: any | null;
  billing?: any | null;

  worker_version?: string;
};

type FieldErrors = Partial<Record<keyof Address, string>>;

const EMPTY_ADDRESS: Address = {
  first_name: "",
  last_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "",         // ✅ 改为空字符串
};

function shapeAddress(raw: any | null): Address {
  if (!raw) return { ...EMPTY_ADDRESS };
  return {
    first_name: raw.first_name || "",
    last_name:  raw.last_name  || "",
    phone:      raw.phone      || "",
    line1:      raw.line1      || "",
    line2:      raw.line2      || "",
    city:       raw.city       || "",
    state:      raw.state      || "",
    postcode:   raw.postcode   || "",
    country:    raw.country    || "",     // ✅ 不再给 "Australia"
    is_default: raw.is_default != null ? !!raw.is_default
               : (raw.type ? true : null),
  };
}

function validateAddress(
  addr: Address,
  kind: "delivery" | "billing"
): { ok: boolean; errors: FieldErrors; message: string } {
  const required: (keyof Address)[] = [
    "first_name",
    "last_name",
    "phone",
    "line1",
    "city",
    "state",
    "postcode",
    "country",
  ];

  const errors: FieldErrors = {};
  for (const key of required) {
    const v = (addr[key] ?? "").toString().trim();
    if (!v) errors[key] = "Required";
  }

  const ok = Object.keys(errors).length === 0;
  const message = ok
    ? ""
    : `Please complete all required ${kind} address fields before saving.`;

  return { ok, errors, message };
}

const baseInputClass =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10";
const readOnlyClass = " bg-neutral-50";
const errorClass = " border-red-400";

export default function EditAddressCard() {
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  const [delivery, setDelivery] = useState<Address>({ ...EMPTY_ADDRESS });
  const [billing, setBilling] = useState<Address>({ ...EMPTY_ADDRESS });

  const [editingDelivery, setEditingDelivery] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);

  const [savingDelivery, setSavingDelivery] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);

  const [deliveryErrors, setDeliveryErrors] = useState<FieldErrors>({});
  const [billingErrors, setBillingErrors] = useState<FieldErrors>({});

  const [deliveryMsg, setDeliveryMsg] = useState<string | null>(null);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  // 初次加载地址
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setGlobalErr(null);
        const r = await fetch("/api/addresses", {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`/api/addresses ${r.status}: ${t}`);
        }
        const data = (await r.json()) as AddressesResp;
        if (dead) return;
        // ✅ 兼容两种返回结构：
        // 1) { delivery, billing }
        // 2) { addresses: { delivery, billing } }
        const d = (data as any)?.delivery ?? (data as any)?.addresses?.delivery ?? null;
        const b = (data as any)?.billing ?? (data as any)?.addresses?.billing ?? null;

        setDelivery(shapeAddress(d));
        setBilling(shapeAddress(b));
      } catch (e: any) {
        if (!dead) setGlobalErr(e?.message || String(e));
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, []);

  async function saveAddress(kind: "delivery" | "billing") {
    const addr = kind === "delivery" ? delivery : billing;
    const { ok, errors, message } = validateAddress(addr, kind);

    // 本地校验不通过 → 不发请求
    if (!ok) {
      if (kind === "delivery") {
        setDeliveryErrors(errors);
        setDeliveryMsg(message);
      } else {
        setBillingErrors(errors);
        setBillingMsg(message);
      }
      return;
    }

    // 清除旧错误
    if (kind === "delivery") {
      setDeliveryErrors({});
      setDeliveryMsg(null);
      setSavingDelivery(true);
    } else {
      setBillingErrors({});
      setBillingMsg(null);
      setSavingBilling(true);
    }
    setGlobalErr(null);

    try {
      const body = {
        type: kind,
        ...addr,
        is_default: addr.is_default ?? true,
      };

      const r = await fetch("/api/addresses", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({} as any));

      if (!r.ok || (data as any)?.error) {
        throw new Error(
          (data as any)?.error ||
            `POST /api/addresses ${r.status} ${r.statusText}`
        );
      }

      // ✅ 兼容两种返回结构：
      // 1) { delivery, billing }
      // 2) { addresses: { delivery, billing } }
      const d = (data as any)?.delivery ?? (data as any)?.addresses?.delivery ?? null;
      const b = (data as any)?.billing ?? (data as any)?.addresses?.billing ?? null;

      if (d) setDelivery(shapeAddress(d));
      if (b) setBilling(shapeAddress(b));

      if (kind === "delivery") {
        setEditingDelivery(false);
      } else {
        setEditingBilling(false);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to save address";
      if (kind === "delivery") {
        setDeliveryMsg(msg);
      } else {
        setBillingMsg(msg);
      }
    } finally {
      if (kind === "delivery") setSavingDelivery(false);
      else setSavingBilling(false);
    }
  }

  const hasAnyAddress =
    Object.values(delivery).some((v) => `${v ?? ""}`.trim()) ||
    Object.values(billing).some((v) => `${v ?? ""}`.trim());

  return (
    <div className="px-4 pb-4 space-y-6">
      {loading && (
        <div className="text-sm text-neutral-500">Loading addresses…</div>
      )}
      {globalErr && (
        <div className="text-sm text-red-600">{globalErr}</div>
      )}

      {!hasAnyAddress && !loading && (
        <div className="mb-3 text-xs text-neutral-500">
          You have not saved any addresses yet. You can save a default delivery
          and billing address during checkout, and they will appear here.
        </div>
      )}

      {/* DELIVERY ADDRESS */}
      <section className="rounded-lg border bg-white">
        {/* <div className="border-b px-4 py-3 text-xs font-semibold text-neutral-500">
          DELIVERY ADDRESS
        </div> */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Delivery address</span>
            {delivery.is_default && (
              <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                Default
              </span>
            )}
          </div>

          {/* name row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">
                First name<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingDelivery}
                value={delivery.first_name || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDelivery((prev) => ({ ...prev, first_name: v }));
                  setDeliveryErrors((prev) => ({
                    ...prev,
                    first_name: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.first_name ? errorClass : "")
                }
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">
                Last name<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingDelivery}
                value={delivery.last_name || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDelivery((prev) => ({ ...prev, last_name: v }));
                  setDeliveryErrors((prev) => ({
                    ...prev,
                    last_name: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.last_name ? errorClass : "")
                }
              />
            </div>
          </div>

          {/* phone */}
          <div>
            <label className="text-xs text-neutral-500">
              Phone<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editingDelivery}
              value={delivery.phone || ""}
              onChange={(e) => {
                const v = e.target.value;
                setDelivery((prev) => ({ ...prev, phone: v }));
                setDeliveryErrors((prev) => ({
                  ...prev,
                  phone: undefined,
                }));
              }}
              className={
                baseInputClass +
                (!editingDelivery ? readOnlyClass : "") +
                (deliveryErrors.phone ? errorClass : "")
              }
            />
          </div>

          {/* line1 */}
          <div>
            <label className="text-xs text-neutral-500">
              Address line 1<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editingDelivery}
              value={delivery.line1 || ""}
              onChange={(e) => {
                const v = e.target.value;
                setDelivery((prev) => ({ ...prev, line1: v }));
                setDeliveryErrors((prev) => ({
                  ...prev,
                  line1: undefined,
                }));
              }}
              className={
                baseInputClass +
                (!editingDelivery ? readOnlyClass : "") +
                (deliveryErrors.line1 ? errorClass : "")
              }
            />
          </div>

          {/* line2 optional */}
          <div>
            <label className="text-xs text-neutral-500">
              Address line 2 (optional)
            </label>
            <input
              disabled={!editingDelivery}
              value={delivery.line2 || ""}
              onChange={(e) => {
                const v = e.target.value;
                setDelivery((prev) => ({ ...prev, line2: v }));
              }}
              className={
                baseInputClass + (!editingDelivery ? readOnlyClass : "")
              }
            />
          </div>

          {/* city / state */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">
                City<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingDelivery}
                value={delivery.city || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDelivery((prev) => ({ ...prev, city: v }));
                  setDeliveryErrors((prev) => ({
                    ...prev,
                    city: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.city ? errorClass : "")
                }
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">
                State/Region<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingDelivery}
                value={delivery.state || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDelivery((prev) => ({ ...prev, state: v }));
                  setDeliveryErrors((prev) => ({
                    ...prev,
                    state: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.state ? errorClass : "")
                }
              />
            </div>
          </div>

          {/* postcode / country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">
                Postcode<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingDelivery}
                value={delivery.postcode || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDelivery((prev) => ({ ...prev, postcode: v }));
                  setDeliveryErrors((prev) => ({
                    ...prev,
                    postcode: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.postcode ? errorClass : "")
                }
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">
                Country<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingDelivery}
                value={delivery.country || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDelivery((prev) => ({ ...prev, country: v }));
                  setDeliveryErrors((prev) => ({
                    ...prev,
                    country: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.country ? errorClass : "")
                }
              />
            </div>
          </div>

          {/* buttons + message */}
          <div className="mt-3 flex items-center gap-3">
            {!editingDelivery ? (
              <button
                type="button"
                onClick={() => {
                  setEditingDelivery(true);
                  setDeliveryMsg(null);
                  setDeliveryErrors({});
                }}
                className="min-w-[96px] rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    // 取消：回到初始状态（重新拉一次比较简单）
                    setEditingDelivery(false);
                    setDeliveryErrors({});
                    setDeliveryMsg(null);
                    // 简单起见从服务器再拉一遍
                    // 也可以缓存初始值，这里为了代码短一点就直接刷新
                    location.reload();
                  }}
                  className="min-w-[96px] rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingDelivery}
                  onClick={() => saveAddress("delivery")}
                  className="min-w-[96px] rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {savingDelivery ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
          {deliveryMsg && (
            <p className="mt-2 text-xs text-red-600">{deliveryMsg}</p>
          )}
        </div>
      </section>

      {/* BILLING ADDRESS */}
      <section className="rounded-lg border bg-white">
        {/* <div className="border-b px-4 py-3 text-xs font-semibold text-neutral-500">
          BILLING ADDRESS
        </div> */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Billing address</span>
            {billing.is_default && (
              <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                Default
              </span>
            )}
          </div>

          {/* name row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">
                First name<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingBilling}
                value={billing.first_name || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBilling((prev) => ({ ...prev, first_name: v }));
                  setBillingErrors((prev) => ({
                    ...prev,
                    first_name: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.first_name ? errorClass : "")
                }
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">
                Last name<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingBilling}
                value={billing.last_name || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBilling((prev) => ({ ...prev, last_name: v }));
                  setBillingErrors((prev) => ({
                    ...prev,
                    last_name: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.last_name ? errorClass : "")
                }
              />
            </div>
          </div>

          {/* phone */}
          <div>
            <label className="text-xs text-neutral-500">
              Phone<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editingBilling}
              value={billing.phone || ""}
              onChange={(e) => {
                const v = e.target.value;
                setBilling((prev) => ({ ...prev, phone: v }));
                setBillingErrors((prev) => ({
                  ...prev,
                  phone: undefined,
                }));
              }}
              className={
                baseInputClass +
                (!editingBilling ? readOnlyClass : "") +
                (billingErrors.phone ? errorClass : "")
              }
            />
          </div>

          {/* line1 */}
          <div>
            <label className="text-xs text-neutral-500">
              Address line 1<span className="text-red-500">*</span>
            </label>
            <input
              disabled={!editingBilling}
              value={billing.line1 || ""}
              onChange={(e) => {
                const v = e.target.value;
                setBilling((prev) => ({ ...prev, line1: v }));
                setBillingErrors((prev) => ({
                  ...prev,
                  line1: undefined,
                }));
              }}
              className={
                baseInputClass +
                (!editingBilling ? readOnlyClass : "") +
                (billingErrors.line1 ? errorClass : "")
              }
            />
          </div>

          {/* line2 optional */}
          <div>
            <label className="text-xs text-neutral-500">
              Address line 2 (optional)
            </label>
            <input
              disabled={!editingBilling}
              value={billing.line2 || ""}
              onChange={(e) => {
                const v = e.target.value;
                setBilling((prev) => ({ ...prev, line2: v }));
              }}
              className={
                baseInputClass + (!editingBilling ? readOnlyClass : "")
              }
            />
          </div>

          {/* city / state */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">
                City<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingBilling}
                value={billing.city || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBilling((prev) => ({ ...prev, city: v }));
                  setBillingErrors((prev) => ({
                    ...prev,
                    city: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.city ? errorClass : "")
                }
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">
                State/Region<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingBilling}
                value={billing.state || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBilling((prev) => ({ ...prev, state: v }));
                  setBillingErrors((prev) => ({
                    ...prev,
                    state: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.state ? errorClass : "")
                }
              />
            </div>
          </div>

          {/* postcode / country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">
                Postcode<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingBilling}
                value={billing.postcode || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBilling((prev) => ({ ...prev, postcode: v }));
                  setBillingErrors((prev) => ({
                    ...prev,
                    postcode: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.postcode ? errorClass : "")
                }
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">
                Country<span className="text-red-500">*</span>
              </label>
              <input
                disabled={!editingBilling}
                value={billing.country || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBilling((prev) => ({ ...prev, country: v }));
                  setBillingErrors((prev) => ({
                    ...prev,
                    country: undefined,
                  }));
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.country ? errorClass : "")
                }
              />
            </div>
          </div>

          {/* buttons + message */}
          <div className="mt-3 flex items-center gap-3">
            {!editingBilling ? (
              <button
                type="button"
                onClick={() => {
                  setEditingBilling(true);
                  setBillingMsg(null);
                  setBillingErrors({});
                }}
                className="min-w-[96px] rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBilling(false);
                    setBillingErrors({});
                    setBillingMsg(null);
                    location.reload();
                  }}
                  className="min-w-[96px] rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingBilling}
                  onClick={() => saveAddress("billing")}
                  className="min-w-[96px] rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {savingBilling ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
          {billingMsg && (
            <p className="mt-2 text-xs text-red-600">{billingMsg}</p>
          )}
        </div>
      </section>
    </div>
  );
}
