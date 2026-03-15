// src/app/profile/EditAddressCard.tsx
"use client";

import { useEffect, useState } from "react";

import { useFormAlert } from "@/hooks/useFormAlert";
import AddressSection from "./AddressSection";

import type {
  Address,
  AddressesResp,
  FieldErrors,
} from "./edit-address-card.types";

import {
  EMPTY_ADDRESS,
  normalizeAddressForUI,
  shapeAddress,
  validateAddress,
} from "./edit-address-card.utils";

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
      country: normalizeAddressForUI(addr).country,
    };
  }

  async function saveAddress(kind: "delivery" | "billing") {
    const addrRaw = kind === "delivery" ? delivery : billing;

    // 保存前兜底规范化 country
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

      <AddressSection
        title="Delivery address"
        address={delivery}
        setAddress={setDelivery}
        editing={editingDelivery}
        setEditing={setEditingDelivery}
        saving={savingDelivery}
        errors={deliveryErrors}
        setErrors={setDeliveryErrors}
        onSave={() => saveAddress("delivery")}
        alert={deliveryAlert}
      />

      <AddressSection
        title="Billing address"
        address={billing}
        setAddress={setBilling}
        editing={editingBilling}
        setEditing={setEditingBilling}
        saving={savingBilling}
        errors={billingErrors}
        setErrors={setBillingErrors}
        onSave={() => saveAddress("billing")}
        alert={billingAlert}
      />
    </div>
  );
}