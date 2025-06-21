// components/Navbar.tsx
'use client'

import Link from 'next/link'
import { ModeToggle } from '@/components/ui/mode-toggle'

export default function Navbar() {
  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 border-b bg-background">
      <Link href="/" className="text-xl font-bold">SocialPlatform</Link>
      <div className="flex items-center gap-4">
        <ModeToggle />
        <div className="w-8 h-8 bg-muted rounded-full" />
      </div>
    </nav>
  )
}
