// src/app/profile/EditProfileCard.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  initialName?: string;
  initialEmail: string;
};

type PatchBody = {
  name?: string;
  email?: string;
};

export default function EditProfileCard({
  initialName = "",
  initialEmail,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 只在外部 props 变化时同步，避免每次退出编辑都把最新 name 覆盖掉
  useEffect(() => {
    setName(initialName || "");
    setEmail(initialEmail || "");
  }, [initialName, initialEmail]);

  async function onSave() {
    if (!editing || saving) return;

    setSaving(true);
    setErr(null);

    try {
      const body: PatchBody = {
        name: name?.trim() || undefined,
        email: email?.trim() || undefined,
      };

      const r = await fetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({} as any));
      if (!r.ok || data?.ok === false) {
        throw new Error(data?.error || `PATCH /api/auth/profile ${r.status}`);
      }

      // 优先使用后端返回的最新 user 信息，其次用刚提交的 body
      const newName = (data?.user?.name as string | undefined) ?? body.name ?? name;
      const newEmail = (data?.user?.email as string | undefined) ?? body.email ?? email;

      setName(newName || "");
      setEmail(newEmail || "");

      // 更新顶部 "Hi, xxx" 的显示（ProfilePage 里给这个 span 一个 id="profile-header-name"）
      const headerNameEl = document.querySelector<HTMLElement>("#profile-header-name");
      if (headerNameEl && newName) {
        headerNameEl.textContent = newName;
      }

      setEditing(false);
      // 不再 reload，JWT 里已经是最新的 name/email 了
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-6 py-4 space-y-4 bg-neutral-50/50">
      {!editing ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs text-neutral-500">User Name</label>
              <div className="mt-1 font-medium">{name || "—"}</div>
            </div>
            <div className="md:col-span-1">
              <label className="text-xs text-neutral-500">Email</label>
              <div className="mt-1 font-medium">{email}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setErr(null);
              }}
              className="min-w-[96px] px-5 py-2 rounded-full border text-sm font-semibold hover:bg-neutral-50"
            >
              Edit
            </button>
          </div>
          {err ? <span className="mt-1 text-xs text-red-600">{err}</span> : null}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs text-neutral-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Your name"
              />
            </div>
            <div className="md:col-span-1">
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
                // 取消时还原回 props 的值
                setName(initialName || "");
                setEmail(initialEmail || "");
                setErr(null);
              }}
              className="min-w-[96px] px-5 py-2 rounded-full border text-sm font-semibold hover:bg-neutral-50"
            >
              Cancel
            </button>
            {/* 编辑状态下 Save 纯黑，可点击；点击后显示 Saving... */}
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="min-w-[96px] px-5 py-2 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50"
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
