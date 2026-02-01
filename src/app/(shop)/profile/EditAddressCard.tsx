// src/app/profile/EditAddressCard.tsx
"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";
import { FieldMessage } from "@/components/ui/field-message";
import CountrySelect from "@/components/address/CountrySelect";

type Address = {
  first_name: string;
  last_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string; // ISO code like "AU"
  is_default?: boolean | number | null;
};

type AddressesResp = {
  ok: boolean;

  // ✅ 新结构：Worker 返回 { addresses: { delivery, billing } }
  addresses?: {
    delivery?: any | null;
    billing?: any | null;
  };

  // ✅ 兼容旧结构
  delivery?: any | null;
  billing?: any | null;

  worker_version?: string;
};

type FieldErrors = Partial<Record<keyof Address, string>>;

const DEFAULT_COUNTRY = "AU";

const EMPTY_ADDRESS: Address = {
  first_name: "",
  last_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "", // keep empty; we will normalize to DEFAULT_COUNTRY at runtime
};

function normalizeCountry(v: any): string {
  const s = String(v ?? "").trim().toUpperCase();
  return s || DEFAULT_COUNTRY;
}

function normalizeAddressForUI(raw: Address): Address {
  return {
    ...raw,
    country: normalizeCountry(raw.country),
  };
}

function shapeAddress(raw: any | null): Address {
  if (!raw) return normalizeAddressForUI({ ...EMPTY_ADDRESS });

  const shaped: Address = {
    first_name: raw.first_name || "",
    last_name: raw.last_name || "",
    phone: raw.phone || "",
    line1: raw.line1 || "",
    line2: raw.line2 || "",
    city: raw.city || "",
    state: raw.state || "",
    postcode: raw.postcode || "",
    country: raw.country || "", // might be "", we normalize below
    is_default: raw.is_default != null ? !!raw.is_default : raw.type ? true : null,
  };

  return normalizeAddressForUI(shaped);
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
  const message = ok ? "" : `Please complete all required ${kind} address fields before saving.`;
  return { ok, errors, message };
}

const baseInputClass =
  "mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10";
const readOnlyClass = " bg-neutral-50";
const errorClass = " border-red-400";

function alertVariantOf(type?: string): "error" | "success" | "warning" | "info" {
  if (type === "success") return "success";
  if (type === "warning") return "warning";
  if (type === "info") return "info";
  return "error";
}

export default function EditAddressCard() {
  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  const [delivery, setDelivery] = useState<Address>(normalizeAddressForUI({ ...EMPTY_ADDRESS }));
  const [billing, setBilling] = useState<Address>(normalizeAddressForUI({ ...EMPTY_ADDRESS }));

  const [editingDelivery, setEditingDelivery] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);

  const [savingDelivery, setSavingDelivery] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);

  const [deliveryErrors, setDeliveryErrors] = useState<FieldErrors>({});
  const [billingErrors, setBillingErrors] = useState<FieldErrors>({});

  const deliveryAlert = useFormAlert();
  const billingAlert = useFormAlert();

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setGlobalErr(null);

        deliveryAlert.clear();
        billingAlert.clear();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function normalizeBeforeSave(addr: Address): Address {
    return {
      ...addr,
      country: normalizeCountry(addr.country),
    };
  }

  async function saveAddress(kind: "delivery" | "billing") {
    const addrRaw = kind === "delivery" ? delivery : billing;

    // ✅ 关键：保存前把 country 真正写进 state 的值（兜底 AU）
    const addr = normalizeBeforeSave(addrRaw);
    if (kind === "delivery") setDelivery(addr);
    else setBilling(addr);

    const { ok, errors, message } = validateAddress(addr, kind);

    if (!ok) {
      if (kind === "delivery") {
        setDeliveryErrors(errors);
        deliveryAlert.error(message);
      } else {
        setBillingErrors(errors);
        billingAlert.error(message);
      }
      return;
    }

    if (kind === "delivery") {
      setDeliveryErrors({});
      deliveryAlert.clear();
      setSavingDelivery(true);
    } else {
      setBillingErrors({});
      billingAlert.clear();
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
        throw new Error((data as any)?.error || `POST /api/addresses ${r.status} ${r.statusText}`);
      }

      const d = (data as any)?.delivery ?? (data as any)?.addresses?.delivery ?? null;
      const b = (data as any)?.billing ?? (data as any)?.addresses?.billing ?? null;

      if (d) setDelivery(shapeAddress(d));
      if (b) setBilling(shapeAddress(b));

      if (kind === "delivery") {
        setEditingDelivery(false);
        deliveryAlert.success("Delivery address saved.");
      } else {
        setEditingBilling(false);
        billingAlert.success("Billing address saved.");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to save address";
      if (kind === "delivery") deliveryAlert.error(msg);
      else billingAlert.error(msg);
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
      {loading && <div className="text-sm text-neutral-500">Loading addresses…</div>}
      {globalErr && <div className="text-sm text-red-600">{globalErr}</div>}

      {!hasAnyAddress && !loading && (
        <div className="mb-3 text-xs text-neutral-500">
          You have not saved any addresses yet. You can save a default delivery and billing
          address during checkout, and they will appear here.
        </div>
      )}

      {/* DELIVERY ADDRESS */}
      <section className="rounded-lg border bg-white">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Delivery address</span>
            {delivery.is_default && (
              <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                Default
              </span>
            )}
          </div>

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
                  setDeliveryErrors((prev) => ({ ...prev, first_name: undefined }));
                  deliveryAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.first_name ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{deliveryErrors.first_name}</FieldMessage>
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
                  setDeliveryErrors((prev) => ({ ...prev, last_name: undefined }));
                  deliveryAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.last_name ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{deliveryErrors.last_name}</FieldMessage>
            </div>
          </div>

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
                setDeliveryErrors((prev) => ({ ...prev, phone: undefined }));
                deliveryAlert.clear();
              }}
              className={
                baseInputClass +
                (!editingDelivery ? readOnlyClass : "") +
                (deliveryErrors.phone ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{deliveryErrors.phone}</FieldMessage>
          </div>

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
                setDeliveryErrors((prev) => ({ ...prev, line1: undefined }));
                deliveryAlert.clear();
              }}
              className={
                baseInputClass +
                (!editingDelivery ? readOnlyClass : "") +
                (deliveryErrors.line1 ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{deliveryErrors.line1}</FieldMessage>
          </div>

          <div>
            <label className="text-xs text-neutral-500">Address line 2 (optional)</label>
            <input
              disabled={!editingDelivery}
              value={delivery.line2 || ""}
              onChange={(e) => {
                const v = e.target.value;
                setDelivery((prev) => ({ ...prev, line2: v }));
                deliveryAlert.clear();
              }}
              className={baseInputClass + (!editingDelivery ? readOnlyClass : "")}
            />
          </div>

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
                  setDeliveryErrors((prev) => ({ ...prev, city: undefined }));
                  deliveryAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.city ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{deliveryErrors.city}</FieldMessage>
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
                  setDeliveryErrors((prev) => ({ ...prev, state: undefined }));
                  deliveryAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.state ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{deliveryErrors.state}</FieldMessage>
            </div>
          </div>

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
                  setDeliveryErrors((prev) => ({ ...prev, postcode: undefined }));
                  deliveryAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingDelivery ? readOnlyClass : "") +
                  (deliveryErrors.postcode ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{deliveryErrors.postcode}</FieldMessage>
            </div>

            {/* ✅ Country: use CountrySelect (NO UI fallback; state already normalized) */}
            <div>
              <label className="text-xs text-neutral-500">
                Country<span className="text-red-500">*</span>
              </label>

              <div className="mt-1">
                <CountrySelect
                  value={delivery.country}
                  disabled={!editingDelivery}
                  invalid={!!deliveryErrors.country}
                  onChange={(code) => {
                    setDelivery((prev) => ({ ...prev, country: code }));
                    setDeliveryErrors((prev) => ({ ...prev, country: undefined }));
                    deliveryAlert.clear();
                  }}
                />
              </div>

              <FieldMessage variant="error">{deliveryErrors.country}</FieldMessage>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {!editingDelivery ? (
              <button
                type="button"
                onClick={() => {
                  // ✅ 进入编辑时也兜底一次，避免 state 里 country 为空但 UI 看起来有值
                  setDelivery((prev) => normalizeAddressForUI(prev));
                  setEditingDelivery(true);
                  setDeliveryErrors({});
                  deliveryAlert.clear();
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
                    setEditingDelivery(false);
                    setDeliveryErrors({});
                    deliveryAlert.clear();
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

          {deliveryAlert.hasAlert && deliveryAlert.alert?.message ? (
            <Alert variant={alertVariantOf(deliveryAlert.alert.type)}>{deliveryAlert.alert.message}</Alert>
          ) : null}
        </div>
      </section>

      {/* BILLING ADDRESS */}
      <section className="rounded-lg border bg-white">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Billing address</span>
            {billing.is_default && (
              <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-medium text-white">
                Default
              </span>
            )}
          </div>

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
                  setBillingErrors((prev) => ({ ...prev, first_name: undefined }));
                  billingAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.first_name ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{billingErrors.first_name}</FieldMessage>
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
                  setBillingErrors((prev) => ({ ...prev, last_name: undefined }));
                  billingAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.last_name ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{billingErrors.last_name}</FieldMessage>
            </div>
          </div>

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
                setBillingErrors((prev) => ({ ...prev, phone: undefined }));
                billingAlert.clear();
              }}
              className={
                baseInputClass +
                (!editingBilling ? readOnlyClass : "") +
                (billingErrors.phone ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{billingErrors.phone}</FieldMessage>
          </div>

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
                setBillingErrors((prev) => ({ ...prev, line1: undefined }));
                billingAlert.clear();
              }}
              className={
                baseInputClass +
                (!editingBilling ? readOnlyClass : "") +
                (billingErrors.line1 ? errorClass : "")
              }
            />
            <FieldMessage variant="error">{billingErrors.line1}</FieldMessage>
          </div>

          <div>
            <label className="text-xs text-neutral-500">Address line 2 (optional)</label>
            <input
              disabled={!editingBilling}
              value={billing.line2 || ""}
              onChange={(e) => {
                const v = e.target.value;
                setBilling((prev) => ({ ...prev, line2: v }));
                billingAlert.clear();
              }}
              className={baseInputClass + (!editingBilling ? readOnlyClass : "")}
            />
          </div>

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
                  setBillingErrors((prev) => ({ ...prev, city: undefined }));
                  billingAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.city ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{billingErrors.city}</FieldMessage>
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
                  setBillingErrors((prev) => ({ ...prev, state: undefined }));
                  billingAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.state ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{billingErrors.state}</FieldMessage>
            </div>
          </div>

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
                  setBillingErrors((prev) => ({ ...prev, postcode: undefined }));
                  billingAlert.clear();
                }}
                className={
                  baseInputClass +
                  (!editingBilling ? readOnlyClass : "") +
                  (billingErrors.postcode ? errorClass : "")
                }
              />
              <FieldMessage variant="error">{billingErrors.postcode}</FieldMessage>
            </div>

            {/* ✅ Country: use CountrySelect */}
            <div>
              <label className="text-xs text-neutral-500">
                Country<span className="text-red-500">*</span>
              </label>

              <div className="mt-1">
                <CountrySelect
                  value={billing.country}
                  disabled={!editingBilling}
                  invalid={!!billingErrors.country}
                  onChange={(code) => {
                    setBilling((prev) => ({ ...prev, country: code }));
                    setBillingErrors((prev) => ({ ...prev, country: undefined }));
                    billingAlert.clear();
                  }}
                />
              </div>

              <FieldMessage variant="error">{billingErrors.country}</FieldMessage>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3">
            {!editingBilling ? (
              <button
                type="button"
                onClick={() => {
                  setBilling((prev) => normalizeAddressForUI(prev));
                  setEditingBilling(true);
                  setBillingErrors({});
                  billingAlert.clear();
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
                    billingAlert.clear();
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

          {billingAlert.hasAlert && billingAlert.alert?.message ? (
            <Alert variant={alertVariantOf(billingAlert.alert.type)}>{billingAlert.alert.message}</Alert>
          ) : null}
        </div>
      </section>
    </div>
  );
}
