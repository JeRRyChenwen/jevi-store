"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AuthShell from "@/components/auth/AuthShell";
import { useMemo, useState } from "react";

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
  const [serverMsg, setServerMsg] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const loginHref = useMemo(() => {
    const base = "/auth/login";
    if (!emailValue) return base;
    const u = new URLSearchParams({ email: emailValue });
    return `${base}?${u.toString()}`;
  }, [emailValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setServerMsg("");
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

      setServerMsg(body?.message || "Registration successful.");
      setSuccess(true);
      // 可选：清空密码字段，保留邮箱以便登录
      reset({
        username: "",
        email: data.email,
        password: "",
        confirmPassword: "",
        marketingOptIn: data.marketingOptIn,
      });
    } catch (e) {
      setServerMsg(e instanceof Error ? e.message : "Unknown error");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

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
      {/* 成功面板：注册成功后显示，不自动跳转 */}
      {success ? (
        <div className="space-y-4 rounded-xl border p-4 bg-green-50">
          <div className="text-green-700 font-semibold">
            {serverMsg || "Registration successful."}
          </div>
          <p className="text-sm text-green-800">
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
        // 表单：未成功时显示；成功后隐藏（不跳转）
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="on">
          <div className="grid gap-3">
            <Label htmlFor="username" className="block">
              Username
            </Label>
            <Input id="username" type="text" autoComplete="username" {...register("username")} />
            {errors.username && (
              <p className="text-red-500 text-sm">{errors.username.message}</p>
            )}
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
              {...register("email")}
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="password" className="block">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="confirmPassword" className="block">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
            )}
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

          {serverMsg && (
            <p className={/fail|error|http/i.test(serverMsg) ? "text-red-500" : "text-green-600"}>
              {serverMsg}
            </p>
          )}

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
