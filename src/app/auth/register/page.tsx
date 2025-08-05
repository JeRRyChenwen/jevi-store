"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useState } from "react"

const schema = z.object({
  username: z.string().min(3, "用户名至少3位"),
  email: z.string().email("请输入有效的邮箱"),
  password: z.string().min(6, "密码至少6位"),
})

type RegisterFormData = z.infer<typeof schema>

export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(schema),
  })

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setErrorMessage("")


    

    try {

      console.log("请求发送数据：", data)
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorRes = await res.json()
        throw new Error(errorRes.message || "注册失败")
      }

      window.location.href = "/auth/login"
    } catch (error: unknown) {
  if (error instanceof Error) {
    setErrorMessage(error.message)
  } else {
    setErrorMessage("未知错误")
  }
}}

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
              <Input {...register("username")} />
              {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
            </div>

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
              {loading ? "注册中..." : "注册"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
