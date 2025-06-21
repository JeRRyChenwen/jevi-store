// app/auth/login/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useForm } from 'react-hook-form'

export default function LoginPage() {
  const { register, handleSubmit } = useForm()

  const onSubmit = (data: any) => {
    console.log('登录表单提交数据：', data)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h2 className="text-2xl font-bold">登录 SocialPlatform</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>
          <div>
            <Label htmlFor="password">密码</Label>
            <Input id="password" type="password" {...register('password')} />
          </div>
          <Button type="submit" className="w-full">登录</Button>
        </form>
      </Card>
    </div>
  )
}
