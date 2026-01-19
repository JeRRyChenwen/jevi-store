"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function extractServerErrorCode(body: any): string {
  const code = body?.error;
  if (typeof code === "string" && code.trim()) return code.trim();
  return "";
}

export default function EditPasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 显示/隐藏密码
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 通用错误（不一定是“新旧相同”）
  const [error, setError] = useState<string | null>(null);

  // 新密码=旧密码（放按钮上方）
  const [passwordSameError, setPasswordSameError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  // ✅ 用于区分：是用户输入导致变化，还是我们成功后程序清空导致变化
  const suppressClearOnceRef = useRef(false);

  // ✅ 用户继续输入时，清掉上一次提示，避免“黏住”
  useEffect(() => {
    // 如果是“程序清空”触发的变化（成功后 setPassword("") / setConfirm("")），跳过一次清理
    if (suppressClearOnceRef.current) {
      suppressClearOnceRef.current = false;
      return;
    }

    if (error) setError(null);
    if (passwordSameError) setPasswordSameError(null);
    if (success) setSuccess(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, confirm]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPasswordSameError(null);
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

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data.ok) {
        const code = extractServerErrorCode(data);

        if (code === "PASSWORD_SAME_AS_OLD") {
          setPasswordSameError("New password must be different from the old password.");
          return;
        }

        throw new Error(data?.error || data?.message || "Failed to update password.");
      }

      // ✅ 成功：先标记“下一次 password/confirm 变化是程序清空导致”，不要把 success 清掉
      suppressClearOnceRef.current = true;

      setPassword("");
      setConfirm("");
      setSuccess("Password updated successfully.");

      // 可选：成功后顺便隐藏明文显示，回到默认更安全
      setShowPassword(false);
      setShowConfirm(false);
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
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

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-600 hover:bg-neutral-100"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">Confirm new password</label>

          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />

            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-600 hover:bg-neutral-100"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* ✅ 通用 Error / Success */}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        {/* Actions */}
        <div className="pt-2">
          {/* ✅ 新密码=旧密码：显示在按钮上方，并与按钮留间距 */}
          {passwordSameError && (
            <div className="mb-4 rounded-lg border bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{passwordSameError}</p>
            </div>
          )}

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
