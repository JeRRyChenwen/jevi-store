"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AuthShell from "@/components/auth/AuthShell";
import { useState } from "react";

const schema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  marketingOptIn: z.boolean().optional(),
});
type RegisterFormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } =
    useForm<RegisterFormData>({ resolver: zodResolver(schema), defaultValues: { marketingOptIn: false } });

  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState<string>("");

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
      try { body = text ? JSON.parse(text) : null; } catch { body = { message: text || "" }; }

      if (!res.ok) {
        const hint = body?.message || body?.error || `HTTP ${res.status} ${res.statusText || ""}`.trim();
        throw new Error(hint || "Registration failed");
      }
      setServerMsg(body?.message || "Registration successful");
      window.location.href = "/auth/login";
    } catch (e) {
      setServerMsg(e instanceof Error ? e.message : "Unknown error");
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
            By clicking <span className="font-medium">Create an Account</span>, you agree to our{" "}
            <a href="/privacy" className="underline ">privacy policy</a>,{" "}
            <a href="/terms" className="underline ">terms &amp; conditions</a> and{" "}
            <a href="/cookies" className="underline ">cookie policy</a>.
          </p>
          <div className="h-8" aria-hidden />
          <p className="hover:text-primary font-semibold">
            Already have an account?{" "}

            <a href="/auth/login" className="underline hover:text-primary font-semibold">Sign in</a>
          </p>
        </div>
      }
    >
      {/* 调大表单项之间的纵向间距 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="on">
        <div className="grid gap-3">
          <Label htmlFor="username" className="block">Username</Label>
          <Input id="username" type="text" autoComplete="username" {...register("username")} />
          {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
        </div>

        <div className="grid gap-3">
          <Label htmlFor="email" className="block">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        <div className="grid gap-3">
          <Label htmlFor="password" className="block">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-start gap-2 text-sm font-semibold">
            <input type="checkbox" className="mt-1" autoComplete="off" {...register("marketingOptIn")} />
            <span>Email me updates on New Arrivals, Sale and Offers</span>
          </label>
          {/* <p className="text-xs text-muted-foreground">
            * We treat your personal data with care. View our{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p> */}
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
    </AuthShell>
  );
}
