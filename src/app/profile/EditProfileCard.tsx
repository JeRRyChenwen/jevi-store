// src/app/profile/EditProfileCard.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail: string;
};

type PatchBody = {
  first_name?: string;
  last_name?: string;
  email?: string;
};

export default function EditProfileCard({
  initialFirstName = "",
  initialLastName = "",
  initialEmail,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 当外部 props 变化时，同步一次（防止切页回来值不同步）
  useEffect(() => {
    if (!editing) {
      setFirstName(initialFirstName || "");
      setLastName(initialLastName || "");
      setEmail(initialEmail || "");
    }
  }, [initialFirstName, initialLastName, initialEmail, editing]);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const body: PatchBody = {
        first_name: firstName?.trim() || undefined,
        last_name: lastName?.trim() || undefined,
        email: email?.trim() || undefined,
      };

      const r = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.ok === false) {
        throw new Error(data?.error || `PATCH /api/auth/profile ${r.status}`);
      }

      setMsg("Saved.");
      setEditing(false);

      // 如果邮箱或名字变了，后端会刷新 cookie；此处刷新页面让 SSR 的“Hi, {name}”也立即更新
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-6 py-4 space-y-4 bg-neutral-50/50">
      <h3 className="text-sm font-semibold">Account Information</h3>

      {/* 编辑 / 只读两种视图 */}
      {!editing ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">First Name</label>
              <div className="mt-1 font-medium">{firstName || "—"}</div>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Last Name</label>
              <div className="mt-1 font-medium">{lastName || "—"}</div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-neutral-500">Email</label>
              <div className="mt-1 font-medium">{email}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-5 py-2 rounded-full border text-sm font-semibold hover:bg-neutral-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50"
            >
              Save
            </button>
            {msg ? <span className="text-xs text-green-600">{msg}</span> : null}
            {err ? <span className="text-xs text-red-600">{err}</span> : null}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-500">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Last name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-neutral-500">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-black/10"
                placeholder="email@example.com"
                type="email"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFirstName(initialFirstName || "");
                setLastName(initialLastName || "");
                setEmail(initialEmail || "");
                setErr(null);
                setMsg(null);
              }}
              className="px-5 py-2 rounded-full border text-sm font-semibold hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-6 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            {err ? <span className="text-xs text-red-600">{err}</span> : null}
          </div>
        </>
      )}
    </div>
  );
}
