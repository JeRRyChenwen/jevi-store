"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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

      // 注册成功后跳转
      window.location.href = "/auth/login"
    } catch (error: any) {
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">注册账号</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="username">用户名</Label>
          <Input id="username" {...register("username")} />
          {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
        </div>

        <div>
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">密码</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>

        {errorMessage && <p className="text-red-500">{errorMessage}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "注册中..." : "注册"}
        </Button>
      </form>
    </div>
  )
}
