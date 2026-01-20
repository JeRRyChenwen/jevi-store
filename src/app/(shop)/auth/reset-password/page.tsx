// src/app/auth/reset-password/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";
import { FieldMessage } from "@/components/ui/field-message";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // e.g. http://localhost:8787

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string().min(8, "Confirmation must be at least 8 characters."),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

type ResetForm = z.infer<typeof schema>;

function extractServerErrorCode(body: any): string {
  // 兼容你后端不同接口的返回结构：
  // - { error: "PASSWORD_SAME_AS_OLD" }
  // - { ok: false, error: "PASSWORD_SAME_AS_OLD" }
  const code = body?.error;
  if (typeof code === "string" && code.trim()) return code.trim();
  return "";
}

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => sp.get("token")?.trim() || "", [sp]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setFocus,
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const [done, setDone] = useState(false);

  // ✅ 表单级提示（通用错误 & success）
  const formAlert = useFormAlert();

  // ✅ 专门用于：新密码=旧密码（放在按钮上方）
  const passwordSameAlert = useFormAlert();

  // ✅ Eye toggle states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ✅ Whenever user types, clear the previous server error to avoid "stacked" messages
  const pwd = watch("password");
  const cfm = watch("confirm");
  useEffect(() => {
    if (formAlert.hasAlert) formAlert.clear();
    if (passwordSameAlert.hasAlert) passwordSameAlert.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwd, cfm]);

  const hasValidationErrors = !!errors.password || !!errors.confirm;

  const onSubmit = async (data: ResetForm) => {
    formAlert.clear();
    passwordSameAlert.clear();

    try {
      if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE in .env.local.");
      if (!token) throw new Error("Invalid reset link: missing token.");

      console.log("[ResetPassword] POST /auth/reset ->", {
        API_BASE,
        hasToken: !!token,
      });

      const res = await fetch(`${API_BASE}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // keep consistent; backend may clear cookies
        body: JSON.stringify({ token, password: data.password }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const code = extractServerErrorCode(body);

        // ✅ 关键：新密码=旧密码时，把错误放到 Update password 按钮上方，并聚焦到 password
        if (code === "PASSWORD_SAME_AS_OLD") {
          passwordSameAlert.error("New password must be different from the old password.");
          try {
            setFocus("password");
          } catch {}
          return;
        }

        // 其他错误保持你原本的逻辑
        const msg = body?.error || body?.message || "Reset failed.";
        throw new Error(msg);
      }

      // ✅ success
      setDone(true);
      formAlert.clear();
      passwordSameAlert.clear();
      reset({ password: "", confirm: "" });
    } catch (err: any) {
      console.log("[ResetPassword] ERROR ->", err);
      formAlert.error(err?.message || "Network or server error.");
    }
  };

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

  // Token missing: show a dedicated state (still in the same upgraded layout)
  if (!token) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-start">
        <div className="mx-auto w-full max-w-5xl px-4 pt-40 pb-16">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            {/* Left */}
            <section className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight">
                Reset your password
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This reset link is invalid or incomplete. Please request a new reset
                link and try again.
              </p>

              <div className="rounded-lg border bg-white/70 p-4 text-sm text-muted-foreground">
                <div className="font-medium text-neutral-900 mb-1">
                  What you can do
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Go back to the “Forgot password” page and request a new link.</li>
                  <li>Make sure the link opens with a token parameter.</li>
                  <li>If the link is old, it may have expired.</li>
                </ul>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Need a new link?</span>{" "}
                <Link
                  href="/auth/forgot-password"
                  className="underline underline-offset-4"
                >
                  Back to forgot password
                </Link>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Already have access?</span>{" "}
                <Link href="/auth/login" className="underline underline-offset-4">
                  Back to login
                </Link>
              </div>
            </section>

            {/* Right */}
            <section>
              <Card className="shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="text-xl">Invalid reset link</CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {/* ✅ 用 Alert 统一展示 */}
                  <Alert variant="error">
                    This link is missing the required token parameter.
                  </Alert>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button asChild className="w-full border border-neutral-300">
                      <Link href="/auth/forgot-password">Request a new link</Link>
                    </Button>

                    <Button asChild variant="outline" className="w-full">
                      <Link href="/auth/login">Back to login</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    );
  }

  // Normal state: token exists
  return (
    <main className="min-h-screen bg-muted/30 flex items-start">
      <div className="mx-auto w-full max-w-5xl px-4 pt-40 pb-16">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          {/* Left: description */}
          <section className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">
              Set a new password
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose a strong password you don’t use elsewhere. After updating, you
              can sign in with your new password immediately.
            </p>

            <div className="rounded-lg border bg-white/70 p-4 text-sm text-muted-foreground">
              <div className="font-medium text-neutral-900 mb-1">
                Before you continue
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>This reset link may expire for security reasons.</li>
                <li>If it fails, request a new reset link.</li>
                <li>Use at least 8 characters for better security.</li>
              </ul>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Need a new link?</span>{" "}
              <Link
                href="/auth/forgot-password"
                className="underline underline-offset-4"
              >
                Back to forgot password
              </Link>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Remember your password?</span>{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Back to login
              </Link>
            </div>
          </section>

          {/* Right: form card */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-xl">
                  {done ? "Password updated" : "Reset password"}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                {done ? (
                  <div className="space-y-4">
                    {/* ✅ 用 Alert 只显示提示条，不把整块面板变绿 */}
                    <Alert variant="success">
                      Your password has been reset successfully. Please sign in with your new password.
                    </Alert>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        onClick={() => router.push("/auth/login")}
                        className="w-full border border-neutral-300"
                      >
                        Go to login
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => router.push("/")}
                        className="w-full"
                      >
                        Back to homepage
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New password</Label>

                      {/* ✅ Input + Eye */}
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Enter a new password"
                          className="pr-10"
                          {...register("password")}
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

                      <FieldMessage variant="error">{errors.password?.message}</FieldMessage>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm new password</Label>

                      {/* ✅ Input + Eye */}
                      <div className="relative">
                        <Input
                          id="confirm"
                          type={showConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Re-enter your new password"
                          className="pr-10"
                          {...register("confirm")}
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

                      <FieldMessage variant="error">{errors.confirm?.message}</FieldMessage>
                    </div>

                    {/* ✅ New password == old password (show ABOVE the button with spacing) */}
                    {passwordSameAlert.hasAlert && passwordSameAlert.alert?.message ? (
                      <Alert variant={passwordSameVariant as any}>
                        {passwordSameAlert.alert.message}
                      </Alert>
                    ) : null}

                    {/* ✅ Other generic server error (also above button) */}
                    {formAlert.hasAlert && formAlert.alert?.message ? (
                      <Alert variant={formAlertVariant as any}>
                        {formAlert.alert.message}
                      </Alert>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={isSubmitting || hasValidationErrors}
                      className="w-full border border-neutral-300"
                    >
                      {isSubmitting ? "Updating..." : "Update password"}
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      If your reset link is expired, request a new one from the forgot password page.
                    </p>

                    <div className="pt-2 flex flex-col gap-2">
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/auth/forgot-password">Request a new link</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/auth/login">Back to login</Link>
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
