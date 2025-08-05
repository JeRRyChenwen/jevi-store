"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const schema = z.object({
  email: z.string().email("请输入有效的邮箱"),
})

type ForgotPasswordFormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema),
  })

  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const onSubmit = async (data: ForgotPasswordFormData) => {
  setLoading(true)
  setSuccessMessage("")
  setErrorMessage("")

  try {
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errorRes = await res.json()
      throw new Error(errorRes.message || "请求失败")
    }

    setSuccessMessage("验证码已发送到您的邮箱，请查收")
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
          <CardTitle className="text-2xl">重置密码</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">请输入您的注册邮箱</Label>
              <Input type="email" {...register("email")} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>

            {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "发送中..." : "发送验证码"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
