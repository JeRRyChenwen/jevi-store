"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { useState } from "react"
import Link from "next/link"

const schema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(6, "密码至少6位"),
})

type LoginFormData = z.infer<typeof schema>

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(schema),
  })

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const onSubmit = async (data: LoginFormData) => {
  setLoading(true)
  setErrorMessage("")

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errorRes = await res.json()
      throw new Error(errorRes.message || "登录失败")
    }

    window.location.href = "/dashboard"
  } catch (error: unknown) {
    if (error instanceof Error) {
      setErrorMessage(error.message)
    } else {
      setErrorMessage("发生未知错误")
    }
  } finally {
    setLoading(false)
  }
}

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
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="password">密码</Label>
              <Input type="password" {...register("password")} />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>

            {errorMessage && <p className="text-red-500">{errorMessage}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "登录中..." : "登录"}
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
  )
}
