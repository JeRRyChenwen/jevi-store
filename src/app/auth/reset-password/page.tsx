// src/app/auth/reset-password/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!; // 例：http://localhost:8787

const schema = z
  .object({
    password: z.string().min(8, "新密码至少 8 位"),
    confirm: z.string().min(8, "确认密码至少 8 位"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "两次输入的密码不一致",
    path: ["confirm"],
  });

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => sp.get("token")?.trim() || "", [sp]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data: ResetForm) => {
    setErrorMessage("");

    try {
      if (!API_BASE) throw new Error("未配置 NEXT_PUBLIC_API_BASE（请在 .env.local 设置）");
      if (!token) throw new Error("重置链接无效：缺少 token");

      console.log("[ResetPassword] POST /auth/reset ->", { API_BASE, hasToken: !!token });

      const res = await fetch(`${API_BASE}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 保持一致即可；后端会清 Cookie 强制重新登录
        body: JSON.stringify({ token, password: data.password }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const msg = body?.error || body?.message || "重置失败";
        throw new Error(msg);
      }

      // 成功：会话被清理（后端已清 Cookie），引导去登录
      setDone(true);
      reset({ password: "", confirm: "" });
    } catch (err: any) {
      console.log("[ResetPassword] ERROR ->", err);
      setErrorMessage(err?.message || "网络或服务器异常");
    }
  };

  // 没带 token 的情况
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-2xl">重置密码</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-500">链接无效：缺少 token 参数。</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/auth/forgot-password">返回“忘记密码”</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/auth/login">返回登录</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle className="text-2xl">设置新密码</CardTitle>
        </CardHeader>

        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="text-green-600 text-sm">密码已重置成功，请使用新密码登录。</p>
              <div className="flex gap-2">
                <Button onClick={() => router.push("/auth/login")}>去登录</Button>
                <Button variant="secondary" onClick={() => router.push("/")}>
                  回到首页
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="password">新密码</Label>
                <Input type="password" autoComplete="new-password" {...register("password")} />
                {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
              </div>

              <div>
                <Label htmlFor="confirm">确认新密码</Label>
                <Input type="password" autoComplete="new-password" {...register("confirm")} />
                {errors.confirm && <p className="text-red-500 text-sm">{errors.confirm.message}</p>}
              </div>

              {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "提交中..." : "提交"}
              </Button>
            </form>
          )}
        </CardContent>

        {!done && (
          <CardFooter className="flex justify-between text-sm">
            <Link href="/auth/forgot-password" className="underline hover:text-primary">
              返回“忘记密码”
            </Link>
            <Link href="/auth/login" className="underline hover:text-primary">
              返回登录
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
