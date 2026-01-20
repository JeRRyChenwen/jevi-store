"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AuthShell from "@/components/auth/AuthShell";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { useFormAlert } from "@/hooks/useFormAlert";
import { FieldMessage } from "@/components/ui/field-message";

import { Eye, EyeOff } from "lucide-react";

const schema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
    marketingOptIn: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type RegisterFormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: { marketingOptIn: false },
  });

  const emailValue = watch("email") || "";
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ✅ Password visibility toggles (same pattern as login)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ 统一表单级提示
  const formAlert = useFormAlert();

  const loginHref = useMemo(() => {
    const base = "/auth/login";
    if (!emailValue) return base;
    const u = new URLSearchParams({ email: emailValue });
    return `${base}?${u.toString()}`;
  }, [emailValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    formAlert.clear();

    try {
      const payload = {
        email: data.email,
        password: data.password,
        name: data.username,
        marketing_opt_in: !!data.marketingOptIn,
      };

      const base = process.env.NEXT_PUBLIC_API_BASE;
      if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE environment variable");

      const res = await fetch(`${base}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { message: text || "" };
      }

      if (!res.ok) {
        const hint =
          body?.message || body?.error || `HTTP ${res.status} ${res.statusText || ""}`.trim();
        throw new Error(hint || "Registration failed");
      }

      formAlert.success(body?.message || "Registration successful.");
      setSuccess(true);

      // 可选：清空密码字段，保留邮箱以便登录（原逻辑保留）
      reset({
        username: "",
        email: data.email,
        password: "",
        confirmPassword: "",
        marketingOptIn: data.marketingOptIn,
      });

      // ✅ optional: reset visibility (pure UI)
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (e) {
      formAlert.error(e instanceof Error ? e.message : "Unknown error");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const alertVariant =
    formAlert.alert?.type === "success"
      ? "success"
      : formAlert.alert?.type === "warning"
        ? "warning"
        : formAlert.alert?.type === "info"
          ? "info"
          : "error";

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join us to track orders, save items and enjoy a faster checkout."
      footer={
        <div className="text-center text-sm text-muted-foreground font-normal space-y-4">
          <p className="text-xs">
            By proceeding to <span className="font-medium">Create account</span>, you accept our{" "}
            <a href="/privacy" className="underline ">
              privacy policy
            </a>
            ,{" "}
            <a href="/terms" className="underline ">
              terms &amp; conditions
            </a>{" "}
            and{" "}
            <a href="/cookies" className="underline ">
              cookie policy
            </a>
            .
          </p>
          <div className="h-8" aria-hidden />
          <p className="hover:text-primary font-semibold">
            Already have an account?{" "}
            <a href="/auth/login" className="underline hover:text-primary font-semibold">
              Sign in
            </a>
          </p>
        </div>
      }
    >
      {success ? (
        <div className="space-y-4 rounded-xl border p-4">
          {formAlert.alert?.message ? (
            <Alert variant="success">{formAlert.alert.message}</Alert>
          ) : (
            <Alert variant="success">Registration successful.</Alert>
          )}

          <p className="text-sm text-muted-foreground">
            Your account has been created. You can now sign in using your email and password.
          </p>

          <div className="flex gap-3">
            <a
              href={loginHref}
              className="inline-flex items-center justify-center rounded-xl px-5 h-10 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Go to Sign in
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl px-5 h-10 text-sm font-semibold border"
            >
              Back to Home
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="on">
          <div className="grid gap-3">
            <Label htmlFor="username" className="block">
              Username
            </Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              {...register("username", { onChange: () => formAlert.clear() })}
            />
            <FieldMessage variant="error">{errors.username?.message}</FieldMessage>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="email" className="block">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              {...register("email", { onChange: () => formAlert.clear() })}
            />
            <FieldMessage variant="error">{errors.email?.message}</FieldMessage>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="password" className="block">
              Password
            </Label>

            {/* ✅ Password + eye icon */}
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...register("password", { onChange: () => formAlert.clear() })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <FieldMessage variant="error">{errors.password?.message}</FieldMessage>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="confirmPassword" className="block">
              Confirm Password
            </Label>

            {/* ✅ Confirm password + eye icon */}
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                {...register("confirmPassword", { onChange: () => formAlert.clear() })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <FieldMessage variant="error">{errors.confirmPassword?.message}</FieldMessage>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="mt-1"
                autoComplete="off"
                {...register("marketingOptIn")}
              />
              <span>Email me updates on New Arrivals, Sale and Offers</span>
            </label>
          </div>

          {formAlert.hasAlert && formAlert.alert?.message ? (
            <Alert variant={alertVariant as any}>{formAlert.alert.message}</Alert>
          ) : null}

          <div className="h-8" aria-hidden />

          <Button
            type="submit"
            disabled={loading}
            className="w-auto px-10 h-11 rounded-xl border border-input mx-auto block"
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
