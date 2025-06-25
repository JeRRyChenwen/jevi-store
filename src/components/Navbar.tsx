// src/components/Navbar.tsx
'use client'

import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

export default function Navbar() {
  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 border-b bg-background">
      <Link href="/" className="text-xl font-bold">
        SocialPlatform
      </Link>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <ModeToggle />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/auth/login" title="登录">
          <User className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
        </Link>
      </div>
    </nav>
  )
}
