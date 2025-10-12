// D:\前端练习\social-platform\src\app\auth\register\page.tsx
"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";

// ✅ 校验保持不变（密码至少 8 位）
const schema = z.object({
  username: z.string().min(3, "用户名至少3位"),
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(8, "密码至少8位"),
  // 订阅勾选：可选布尔
  marketingOptIn: z.boolean().optional(),
});

type RegisterFormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
    defaultValues: { marketingOptIn: false },
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setErrorMessage("");

    try {
      // ✅ 把 username 映射为后端期望的 name；把勾选结果作为 marketing_opt_in 一并提交
      const payload = {
        email: data.email,
        password: data.password,
        name: data.username,
        marketing_opt_in: !!data.marketingOptIn,
      };

      const base = process.env.NEXT_PUBLIC_API_BASE;
      if (!base) throw new Error("缺少 NEXT_PUBLIC_API_BASE 环境变量");

      // 调用 Worker 的 /auth/register（后端会根据 marketing_opt_in 自动 upsert 订阅）
      const res = await fetch(`${base}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(json?.error || "注册失败");
      }

      // 成功后跳转登录
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

            {/* ✅ 英文文案（与截图一致） */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  {...register("marketingOptIn")}
                />
                <span>Email me updates on New Arrivals, Sale and Offers</span>
              </label>
              <p className="text-xs text-neutral-500">
                * We treat your personal data with care, view our{" "}
                <a href="/privacy" className="underline">
                  Privacy Policy
                </a>
                .
              </p>
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
