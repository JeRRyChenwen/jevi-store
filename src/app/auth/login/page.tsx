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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // 开发建议: http://localhost:8787

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
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
  });

  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage("");

    const payload = {
      email: data.email.trim().toLowerCase(),
      password: data.password,
    };

    try {
      if (!API_BASE) throw new Error("未配置 NEXT_PUBLIC_API_BASE（请在 .env.local 设置）");

      console.log("[Login] submit", { email: payload.email, API_BASE });

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ★ 接收 HttpOnly Cookie
        body: JSON.stringify(payload),
      });

      console.log("[Login] /auth/login status =", res.status);

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        if (res.status === 401) throw new Error("邮箱或密码不正确");
        throw new Error(body?.error || body?.message || "登录失败");
      }

      // ✅ 登录成功：等待会话就绪，再通知 Navbar 并跳转
      console.log("[Login] res.ok. document.cookie(before poll) =", document.cookie);

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      let ready = false;
      for (const delay of [0, 80, 160, 320, 480]) {
        try {
          const r = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
          console.log(`[Login] /auth/me attempt delay=${delay} status=${r.status}`);
          if (r.ok) { ready = true; break; }
        } catch (e) {
          console.log("[Login] /auth/me attempt error:", e);
        }
        await sleep(delay);
      }

      console.log("[Login] meReady =", ready, "document.cookie(after poll) =", document.cookie);

      console.log("[Login] dispatch sp-auth-changed");
      window.dispatchEvent(new Event("sp-auth-changed")); // 让 Navbar 立刻刷新

      console.log("[Login] router.push('/')");
      router.push("/");                                   // 跳到首页
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
