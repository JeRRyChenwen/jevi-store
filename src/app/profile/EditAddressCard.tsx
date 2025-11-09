// src/app/profile/EditAddressCard.tsx
"use client";

import { useEffect, useState } from "react";

type AddressRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;

  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;

  is_default?: boolean | null;

  created_at_ts?: number | null;
  updated_at_ts?: number | null;
  created_at_cn?: string | null;
  updated_at_cn?: string | null;
};

type AddressesResp =
  | {
      ok: true;
      delivery: AddressRow | null;
      billing: AddressRow | null;
      worker_version?: string;
    }
  | {
      ok?: false;
      error?: string;
      worker_version?: string;
    };

// 前端编辑使用的表单数据类型
type AddressFormData = {
  first_name: string;
  last_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
};

function fromRowToForm(row: AddressRow | null): AddressFormData {
  return {
    first_name: row?.first_name ?? "",
    last_name: row?.last_name ?? "",
    phone: row?.phone ?? "",
    line1: row?.line1 ?? "",
    line2: row?.line2 ?? "",
    city: row?.city ?? "",
    state: row?.state ?? "",
    postcode: row?.postcode ?? "",
    country: row?.country ?? "",
  };
}

type CardProps = {
  label: string;
  kind: "delivery" | "billing";
  addr: AddressRow | null;
  onSave: (kind: "delivery" | "billing", data: AddressFormData) => Promise<void>;
  globalSavingKind: "delivery" | "billing" | null;
};

function AddressCard({ label, kind, addr, onSave, globalSavingKind }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AddressFormData>(fromRowToForm(addr));
  const [localErr, setLocalErr] = useState<string | null>(null);

  // 外部地址变了时，如果当前不是编辑状态，则同步一下表单
  useEffect(() => {
    if (!editing) {
      setForm(fromRowToForm(addr));
    }
  }, [addr, editing]);

  if (!addr) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-500">
        No {label.toLowerCase()} saved yet.
      </div>
    );
  }

  const baseField =
    "mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10";
  const readOnlyField = baseField + " bg-neutral-50 cursor-default";
  const editableField = baseField + " bg-white";

  const saving = globalSavingKind === kind;

  async function handleSave() {
    if (!editing) return;
    setLocalErr(null);
    try {
      await onSave(kind, form);
      setEditing(false);
    } catch (e: any) {
      setLocalErr(e?.message || "Save failed");
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-4 text-sm space-y-4">
      {/* 标题 + Default 标记 */}
      <div className="flex items-center justify-between">
        <div className="font-medium">{label}</div>
        {addr.is_default ? (
          <span className="inline-flex items-center rounded-full bg-black text-white px-2 py-0.5 text-xs">
            Default
          </span>
        ) : null}
      </div>

      {/* 表单布局：两列 + 单列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First / Last Name */}
        <div>
          <label className="text-xs text-neutral-500">First Name</label>
          <input
            readOnly={!editing}
            value={form.first_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, first_name: e.target.value }))
            }
            className={editing ? editableField : readOnlyField}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Last Name</label>
          <input
            readOnly={!editing}
            value={form.last_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, last_name: e.target.value }))
            }
            className={editing ? editableField : readOnlyField}
          />
        </div>

        {/* Phone */}
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-500">Phone</label>
          <input
            readOnly={!editing}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className={editing ? editableField : readOnlyField}
          />
        </div>

        {/* Address Line 1 */}
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-500">Address Line 1</label>
          <input
            readOnly={!editing}
            value={form.line1}
            onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
            className={editing ? editableField : readOnlyField}
          />
        </div>

        {/* Address Line 2 */}
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-500">
            Address Line 2 (optional)
          </label>
          <input
            readOnly={!editing}
            value={form.line2}
            onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
            className={editing ? editableField : readOnlyField}
          />
        </div>

        {/* City / State */}
        <div>
          <label className="text-xs text-neutral-500">City</label>
          <input
            readOnly={!editing}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className={editing ? editableField : readOnlyField}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">State/Region</label>
          <input
            readOnly={!editing}
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className={editing ? editableField : readOnlyField}
          />
        </div>

        {/* Postcode / Country */}
        <div>
          <label className="text-xs text-neutral-500">Postcode</label>
          <input
            readOnly={!editing}
            value={form.postcode}
            onChange={(e) =>
              setForm((f) => ({ ...f, postcode: e.target.value }))
            }
            className={editing ? editableField : readOnlyField}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Country</label>
          <input
            readOnly={!editing}
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value }))
            }
            className={editing ? editableField : readOnlyField}
          />
        </div>
      </div>

      {/* 错误提示（每块地址自己的） */}
      {localErr && (
        <div className="text-xs text-red-600">
          {localErr}
        </div>
      )}

      {/* 按钮区域：和 EditProfileCard 的按钮风格保持一致 */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => {
            if (editing) {
              // 取消编辑：还原为 addr 内容
              setForm(fromRowToForm(addr));
              setEditing(false);
              setLocalErr(null);
            } else {
              setEditing(true);
              setLocalErr(null);
            }
          }}
          className="min-w-[96px] px-5 py-2 rounded-full border text-sm font-semibold hover:bg-neutral-50"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!editing || saving}
          className="min-w-[96px] px-5 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function EditAddressCard() {
  const [delivery, setDelivery] = useState<AddressRow | null>(null);
  const [billing, setBilling] = useState<AddressRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savingKind, setSavingKind] = useState<"delivery" | "billing" | null>(
    null
  );

  async function fetchAddresses() {
    const res = await fetch("/api/addresses", {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`/api/addresses ${res.status}: ${txt}`);
    }

    const data = (await res.json()) as AddressesResp;

    if ("ok" in data && data.ok === false) {
      throw new Error(data.error || "failed to load addresses");
    }

    setDelivery((data as any).delivery ?? null);
    setBilling((data as any).billing ?? null);
  }

  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await fetchAddresses();
      } catch (e: any) {
        if (!dead) setErr(e?.message || "Failed to load addresses");
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(kind: "delivery" | "billing", data: AddressFormData) {
    setSavingKind(kind);
    setErr(null);
    try {
      // 🌟 这里是关键：把编辑后的地址提交给后端
      // 假设 d1-worker 的 /addresses 支持这种 body：
      // { type: "delivery" | "billing", first_name, last_name, phone, line1, line2, city, state, postcode, country }
      const res = await fetch("/api/addresses", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          type: kind,
          ...data,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || (json && json.ok === false)) {
        throw new Error(json?.error || `POST /api/addresses ${res.status}`);
      }

      // 保存成功后重新从后端获取一次最新的地址
      await fetchAddresses();
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      // 抛出给子组件，让它显示自己的 localErr
      throw e;
    } finally {
      setSavingKind(null);
    }
  }

  return (
    <div className="px-4 pb-4 space-y-4">
      {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

      {loading && (
        <div className="text-sm text-neutral-500">Loading addresses…</div>
      )}

      {!loading && !err && !delivery && !billing && (
        <div className="text-sm text-neutral-500">
          You have not saved any addresses yet.
          <br />
          You can save a default delivery and billing address during checkout, and they
          will appear here.
        </div>
      )}

      {delivery || (!loading && !err) ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-neutral-500">
            Delivery Address
          </div>
          <AddressCard
            label="Delivery address"
            kind="delivery"
            addr={delivery}
            onSave={handleSave}
            globalSavingKind={savingKind}
          />
        </div>
      ) : null}

      {billing || (!loading && !err) ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-neutral-500">
            Billing Address
          </div>
          <AddressCard
            label="Billing address"
            kind="billing"
            addr={billing}
            onSave={handleSave}
            globalSavingKind={savingKind}
          />
        </div>
      ) : null}
    </div>
  );
}
