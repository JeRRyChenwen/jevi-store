"use client";

import { useState } from "react";

export default function EditPasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password || !confirm) {
      setError("Please enter your new password twice.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password,
          password_confirm: confirm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to update password.");
      }

      setPassword("");
      setConfirm("");
      setSuccess("Password updated successfully.");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 提示文案 */}
      <p className="text-sm text-neutral-600">
        Update your account password. Make sure it is strong and not used
        elsewhere.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 max-w-md">
        {/* New password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">New password</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Confirm new password
          </label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            placeholder="Re-enter new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {/* Error / Success */}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        {/* Actions */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full border px-5 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
