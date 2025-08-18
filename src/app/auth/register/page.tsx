"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";

// ✅ 和后端校验一致：密码至少 8 位
const schema = z.object({
  username: z.string().min(3, "用户名至少3位"),
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(8, "密码至少8位"),
});

type RegisterFormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setErrorMessage("");

    try {
      // ✅ 把 username 映射为后端期望的 name；bio 可选，这里不传
      const payload = {
        email: data.email,
        password: data.password,
        name: data.username,
      };

      const base = process.env.NEXT_PUBLIC_API_BASE;
      if (!base) throw new Error("缺少 NEXT_PUBLIC_API_BASE 环境变量");

      // ✅ 直接调用 Worker 的 /auth/register
      const res = await fetch(`${base}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        // 后端错误格式为 { error: string }
        throw new Error(json?.error || "注册失败");
      }

      // 成功后跳转到登录页（按你的路由习惯调整）
      window.location.href = "/auth/login";
    } catch (error: unknown) {
      if (error instanceof Error) setErrorMessage(error.message);
      else setErrorMessage("未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle className="text-2xl">注册账号</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input id="username" {...register("username")} />
              {errors.username && (
                <p className="text-red-500 text-sm">{errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            {errorMessage && <p className="text-red-500">{errorMessage}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "注册中..." : "注册"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
