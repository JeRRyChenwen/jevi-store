'use client'

import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Navbar() {
  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 border-b bg-background">
      {/* 左侧 Logo */}
      <Link href="/" className="text-xl font-bold">
        SocialPlatform
      </Link>

      {/* 右侧功能区域 */}
      <div className="flex items-center gap-4">
        {/* 主题切换 */}
        <ModeToggle />

        {/* 登录图标 */}
        <Link href="/auth/login" title="登录">
          <User className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
        </Link>

        {/* 注册按钮 */}
        <Link href="/auth/register">
          <Button variant="outline">注册</Button>
        </Link>
      </div>
    </nav>
  )
}
