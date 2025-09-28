'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, Settings, User } from 'lucide-react'

interface User {
  id: number
  email: string
  name: string
  role: 'analyst' | 'admin'
  emailVerified: boolean
}

interface HeaderProps {
  user?: User | null
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="font-bold text-lg">
          Chat + Canvas
        </Link>
        
        <nav className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.name} ({user.role})
              </span>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <form action="/api/auth/logout" method="post">
                <Button variant="ghost" size="sm" type="submit">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline" size="sm">Register</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}