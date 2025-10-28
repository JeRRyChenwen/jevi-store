// D:\前端练习\social-platform\src\app\auth\login\page.tsx
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import AuthShell from "@/components/auth/AuthShell";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

const AUTH_BASE = "/api";
const buildAuth = (p: string) => `${AUTH_BASE}${p.startsWith("/") ? p : `/${p}`}`;

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type LoginFormData = z.infer<typeof schema>;

export default function LoginPage() {
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/";

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginFormData>({ resolver: zodResolver(schema) });

  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage("");
    const email = data.email.trim().toLowerCase();
    const payload = { email, identifier: email, password: data.password };

    try {
      const res = await fetch(buildAuth("/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      let body: any = null;
      try { body = await res.clone().json(); } catch {}

      if (!res.ok) {
        if (res.status === 401) throw new Error(body?.error || "Invalid email or password");
        throw new Error(body?.error || body?.message || `Login failed (${res.status})`);
      }

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (const delay of [0, 80, 160, 320, 480]) {
        try {
          const r = await fetch(buildAuth("/auth/me"), {
            credentials: "include",
            cache: "no-store",
            headers: { accept: "application/json" },
          });
          if (r.status === 200) break;
        } catch {}
        await sleep(delay);
      }

      try {
        window.dispatchEvent(new Event("sp-auth-changed"));
        localStorage.setItem("sp_auth_ping", `${Date.now()}`);
      } catch {}

      window.location.href = nextUrl;
    } catch (err: any) {
      setErrorMessage(err?.message || "Network or server error");
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Access your saved items and orders."
      footer={
        <div className="text-center text-sm text-muted-foreground font-semibold space-y-4">
          <p>
            Don’t have an account?{" "}
            <a href="/auth/register" className="underline hover:text-primary font-semibold">Create one</a>
          </p>
          <div className="h-8" aria-hidden />
          <p>
            <a href="/auth/forgot-password" className="underline hover:text-primary font-semibold">Forgot password?</a>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="on">
        <div className="grid gap-3">
          <Label htmlFor="email" className="block">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div className="grid gap-3">
          <Label htmlFor="password" className="block">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>

        {errorMessage && <p className="text-red-600 text-sm">{errorMessage}</p>}

        {/* ⬇️ 两行空白（每行约 2rem） */}
        <div className="h-8" aria-hidden />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-auto px-10 h-11 rounded-xl border border-input mx-auto block"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
