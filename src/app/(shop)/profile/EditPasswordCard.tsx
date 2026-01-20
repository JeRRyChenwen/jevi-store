"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { FieldMessage } from "@/components/ui/field-message";
import { useFormAlert } from "@/hooks/useFormAlert";

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

  // ✅ 字段级错误（替代原本通用 error 文案的部分场景）
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);

  // ✅ 表单级提示：通用 error / success
  const formAlert = useFormAlert();

  // ✅ 新密码=旧密码（放按钮上方）
  const passwordSameAlert = useFormAlert();

  // ✅ 用于区分：是用户输入导致变化，还是我们成功后程序清空导致变化
  const suppressClearOnceRef = useRef(false);

  // ✅ 用户继续输入时，清掉上一次提示，避免“黏住”
  useEffect(() => {
    // 如果是“程序清空”触发的变化（成功后 setPassword("") / setConfirm("")），跳过一次清理
    if (suppressClearOnceRef.current) {
      suppressClearOnceRef.current = false;
      return;
    }

    if (passwordErr) setPasswordErr(null);
    if (confirmErr) setConfirmErr(null);

    if (formAlert.hasAlert) formAlert.clear();
    if (passwordSameAlert.hasAlert) passwordSameAlert.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, confirm]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ✅ 清理旧提示
    setPasswordErr(null);
    setConfirmErr(null);
    formAlert.clear();
    passwordSameAlert.clear();

    // ====== 前端校验（保留你的逻辑，只是拆到字段级） ======
    if (!password || !confirm) {
      if (!password) setPasswordErr("Please enter your new password.");
      if (!confirm) setConfirmErr("Please confirm your new password.");
      return;
    }

    if (password !== confirm) {
      setConfirmErr("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setConfirmErr("Password must be at least 8 characters long.");
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
          // ✅ 仍然保持“放按钮上方”的专用提示
          passwordSameAlert.error("New password must be different from the old password.");
          return;
        }

        throw new Error(data?.error || data?.message || "Failed to update password.");
      }

      // ✅ 成功：先标记“下一次 password/confirm 变化是程序清空导致”，不要把 success 清掉
      suppressClearOnceRef.current = true;

      setPassword("");
      setConfirm("");

      // ✅ success 统一走 alert
      formAlert.success("Password updated successfully.");

      // 可选：成功后顺便隐藏明文显示，回到默认更安全
      setShowPassword(false);
      setShowConfirm(false);
    } catch (e: any) {
      formAlert.error(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const formAlertVariant =
    formAlert.alert?.type === "success"
      ? "success"
      : formAlert.alert?.type === "warning"
        ? "warning"
        : formAlert.alert?.type === "info"
          ? "info"
          : "error";

  const passwordSameVariant =
    passwordSameAlert.alert?.type === "success"
      ? "success"
      : passwordSameAlert.alert?.type === "warning"
        ? "warning"
        : passwordSameAlert.alert?.type === "info"
          ? "info"
          : "error";

  return (
    <div className="space-y-4">
      {/* 提示文案 */}
      <p className="text-sm text-neutral-600">
        Update your account password. Make sure it is strong and not used elsewhere.
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
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <FieldMessage variant="error">{passwordErr}</FieldMessage>
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
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <FieldMessage variant="error">{confirmErr}</FieldMessage>
        </div>

        {/* Actions */}
        <div className="pt-2">
          {/* ✅ 新密码=旧密码：显示在按钮上方，并与按钮留间距 */}
          {passwordSameAlert.hasAlert && passwordSameAlert.alert?.message ? (
            <div className="mb-4">
              <Alert variant={passwordSameVariant as any}>
                {passwordSameAlert.alert.message}
              </Alert>
            </div>
          ) : null}

          {/* ✅ 通用 Error / Success：也在按钮上方（但不抢“同密码”那条的位置） */}
          {formAlert.hasAlert && formAlert.alert?.message ? (
            <div className="mb-4">
              <Alert variant={formAlertVariant as any}>{formAlert.alert.message}</Alert>
            </div>
          ) : null}

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
