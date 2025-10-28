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

const schema = z.object({
  username: z.string().min(3, "用户名至少3位"),
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(8, "密码至少8位"),
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
      if (!base) throw new Error("缺少 NEXT_PUBLIC_API_BASE 环境变量");

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
          body?.message ||
          body?.error ||
          `HTTP ${res.status} ${res.statusText || ""}`.trim();
        throw new Error(hint || "注册失败");
      }

      setServerMsg(body?.message || "注册成功");
      window.location.href = "/auth/login";
    } catch (e) {
      setServerMsg(e instanceof Error ? e.message : "未知错误");
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"   // ✅ 只保留 autoComplete
                {...register("username")} // register 已包含 name="username"
              />
              {errors.username && (
                <p className="text-red-500 text-sm">{errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                {...register("email")}    // 不要再写 name="email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password" // 注册页用 new-password
                {...register("password")}    // 不要再写 name="password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  autoComplete="off"
                  {...register("marketingOptIn")} // 已带 name
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

            {serverMsg && (
              <p className={/失败|error|HTTP/i.test(serverMsg) ? "text-red-500" : "text-green-600"}>
                {serverMsg}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "注册中..." : "注册"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
