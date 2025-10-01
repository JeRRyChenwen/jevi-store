// src/app/auth/login/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ⚙️ 基址：有 NEXT_PUBLIC_API_BASE（比如你的 Cloudflare Worker）就用它，否则走 Next 内置 /api
const ENV_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").trim();
const API_BASE = ENV_BASE || "/api";
const build = (p: string) => `${API_BASE}${p.startsWith("/") ? p : `/${p}`}`;

const schema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(8, "密码至少8位"),
});
type LoginFormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(schema) });

  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage("");

    const payload = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
    };

    try {
      console.log("[Login] submit =>", { email: payload.email, API_BASE });

      // 1) 登录（会在服务器写入 sp_has_session / sp_user 等 cookie）
      const res = await fetch(build("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 接收 HttpOnly/同站 Cookie
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({} as any));
      console.log("[Login] /auth/login status=", res.status, body);

      if (!res.ok) {
        if (res.status === 401) throw new Error("邮箱或密码不正确");
        throw new Error(body?.error || body?.message || "登录失败");
      }

      // 2) 轮询 /auth/me，直到 200（有会话）或放弃
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let ready = false;
      for (const delay of [0, 80, 160, 320, 480, 640]) {
        try {
          const r = await fetch(build("/auth/me"), { credentials: "include", cache: "no-store" });
          console.log(`[Login] /auth/me attempt delay=${delay} status=${r.status}`);
          if (r.status === 200) { ready = true; break; }
          // 204=未登录；其它错误继续尝试
        } catch (e) {
          console.log("[Login] /auth/me error:", e);
        }
        await sleep(delay);
      }

      if (!ready) {
        console.warn("[Login] 会话还未就绪，但继续跳转（Navbar 会自我修复）");
      }

      // 3) 通知导航刷新，再跳首页
      window.dispatchEvent(new Event("sp-auth-changed"));
      router.push("/");
    } catch (err: any) {
      console.error("[Login] error:", err);
      setErrorMessage(err?.message || "网络或服务器异常");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md p-6 flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-2xl">登录</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>

            {errorMessage && <p className="text-red-500">{errorMessage}</p>}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between text-sm">
          <Link href="/auth/register" className="underline hover:text-primary">
            没有账号？去注册
          </Link>
          <Link href="/auth/forgot-password" className="underline hover:text-primary">
            忘记密码？
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
