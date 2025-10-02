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
import { useRouter, useSearchParams } from "next/navigation";

/** ✅ 鉴权接口一律走本地 /api，保证 Cookie 写在 localhost:3000 域上 */
const AUTH_BASE = "/api";
const buildAuth = (p: string) => `${AUTH_BASE}${p.startsWith("/") ? p : `/${p}`}`;

const schema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(8, "密码至少8位"),
});
type LoginFormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/";

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
      if (process.env.NODE_ENV !== "production") {
        console.log("[Login] submit =>", { email: payload.email });
      }

      // 1) 调用本地 /api/auth/login，让本地域写入会话 Cookie
      const res = await fetch(buildAuth("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      // 尝试解析错误信息（成功时不强求 JSON）
      let body: any = null;
      try {
        body = await res.clone().json();
      } catch {}

      if (!res.ok) {
        if (res.status === 401) throw new Error(body?.error || "邮箱或密码不正确");
        throw new Error(body?.error || body?.message || `登录失败（${res.status}）`);
      }

      // 2) 轮询本地 /api/auth/me，确认会话可读（最多 ~1s）
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let ready = false;
      for (const delay of [0, 80, 160, 320, 480]) {
        try {
          const r = await fetch(buildAuth("/auth/me"), {
            credentials: "include",
            cache: "no-store",
          });
          if (process.env.NODE_ENV !== "production") {
            console.log(`[Login] /api/auth/me attempt delay=${delay} status=${r.status}`);
          }
          if (r.status === 200) {
            ready = true;
            break;
          }
          // 204 = 还未就绪；其它错误继续尝试
        } catch (e) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("[Login] /api/auth/me error:", e);
          }
        }
        await sleep(delay);
      }

      if (!ready && process.env.NODE_ENV !== "production") {
        console.warn("[Login] 会话尚未就绪，继续跳转（Navbar 将自行刷新）");
      }

      // 3) 通知其它标签页/组件刷新
      try {
        window.dispatchEvent(new Event("sp-auth-changed"));
        localStorage.setItem("sp_auth_ping", `${Date.now()}`);
      } catch {}

      // 4) 使用“硬跳转”更稳，避免 RSC 软导航失败
      window.location.href = nextUrl;
      // 如果你更想保持 SPA，可用 router.push(nextUrl)，但可能再次触发你之前的 RSC 载荷问题：
      // router.push(nextUrl);
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Login] error:", err);
      }
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
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {errorMessage && (
              <p className="text-red-600 text-sm">{errorMessage}</p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-between text-sm">
          <Link href="/auth/register" className="underline hover:text-primary" prefetch={false}>
            没有账号？去注册
          </Link>
          <Link href="/auth/forgot-password" className="underline hover:text-primary" prefetch={false}>
            忘记密码？
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
