"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // 例：http://localhost:8787

const schema = z.object({
  email: z.string().email("请输入有效的邮箱"),
});

type ForgotPasswordFormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema),
  });

  const [sent, setSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setSuccessMessage("");
    setErrorMessage("");

    try {
      if (!API_BASE) {
        throw new Error("未配置 NEXT_PUBLIC_API_BASE（请在 .env.local 设置）");
      }

      const email = data.email.trim().toLowerCase();

      console.log("[ForgotPassword] POST /auth/forgot ->", { API_BASE, email });

      const res = await fetch(`${API_BASE}/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 可要可不要；保持一致即可
        body: JSON.stringify({ email }),
      });

      const body = await res.json().catch(() => ({} as any));

      // 无论邮箱是否存在，后端都会返回 { ok: true }（防止撞库）
      if (!res.ok) {
        const msg = body?.error || body?.message || "请求失败";
        throw new Error(msg);
      }

      setSent(true);
      setSuccessMessage("如果该邮箱存在，我们已发送重置链接，请检查邮箱（开发环境可在 Worker 控制台查看重置链接日志）");
      console.log("[ForgotPassword] OK ->", body);
    } catch (err: any) {
      console.log("[ForgotPassword] ERROR ->", err);
      setErrorMessage(err?.message || "网络或服务器异常");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md p-6 flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-2xl">忘记密码</CardTitle>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-green-600 text-sm">{successMessage}</p>
              <p className="text-sm text-muted-foreground">
                收到邮件后，点击其中的链接进入重置页面（<code>/auth/reset-password?token=...</code>），设置新密码。
              </p>
              <div className="flex gap-2">
                <Button asChild variant="secondary">
                  <Link href="/auth/login">返回登录</Link>
                </Button>
                <Button
                  onClick={() => {
                    // 允许再次发送
                    setSent(false);
                    setSuccessMessage("");
                    setErrorMessage("");
                  }}
                  variant="outline"
                >
                  重新发送
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">请输入您的注册邮箱</Label>
                <Input type="email" {...register("email")} />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
              </div>

              {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
              {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "发送中..." : "发送重置链接"}
              </Button>

              <div className="text-sm text-muted-foreground">
                <p>提示：开发环境下，后端会把重置链接打印在 wrangler 控制台日志中。</p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
