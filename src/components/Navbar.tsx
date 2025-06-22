'use client'

import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { User } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 border-b bg-background">
      {/* Logo / Brand */}
      <Link href="/" className="text-xl font-bold">
        SocialPlatform
      </Link>

      {/* 右侧区域 */}
      <div className="flex items-center gap-4">
        {/* 主题切换 */}
        <ModeToggle />

        {/* 登录按钮或用户图标 */}
        <Link href="/auth/login" title="登录">
          <User className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
        </Link>
      </div>
    </nav>
  )
}
