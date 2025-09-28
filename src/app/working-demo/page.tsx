'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatInterface } from '@/components/chat/chat-interface'
import { Canvas } from '@/components/layout/canvas'

interface User {
  id: number
  email: string
  name: string
  role: string
}

export default function WorkingDemoPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('register')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !name) return

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setMessage(`✅ Registration successful! Now you can login.`)
        setMode('login')
        setPassword('') // Clear for login
      } else {
        setMessage(`❌ Registration failed: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Registration error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setUser(data.user)
        setIsLoggedIn(true)
        setMessage(`✅ Login successful! Welcome ${data.user.name}`)
      } else {
        setMessage(`❌ Login failed: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Login error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setIsLoggedIn(false)
      setMessage('Logged out successfully')
      setEmail('')
      setPassword('')
      setName('')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoggedIn && user) {
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="font-bold text-lg">Chat + Canvas</div>
            <div className="ml-auto flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {user.name} ({user.role})
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        {/* Main App Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Interface */}
          <div className="flex-1 min-w-0">
            <ChatInterface />
          </div>
          
          {/* Canvas Panel */}
          <div className="w-96 min-w-96 max-w-2xl">
            <Canvas />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              🎉 Chat + Canvas Working Demo
            </CardTitle>
            <CardDescription>
              This is a working version of the authentication system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <div className={`p-3 rounded-md mb-4 text-sm ${
                message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="flex space-x-2 mb-4">
              <Button
                variant={mode === 'register' ? 'default' : 'outline'}
                onClick={() => setMode('register')}
                className="flex-1"
              >
                Register
              </Button>
              <Button
                variant={mode === 'login' ? 'default' : 'outline'}
                onClick={() => setMode('login')}
                className="flex-1"
              >
                Login
              </Button>
            </div>

            <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required={mode === 'register'}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Create a password (min 8 chars)' : 'Enter your password'}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading 
                  ? (mode === 'register' ? 'Creating Account...' : 'Signing In...') 
                  : (mode === 'register' ? 'Create Account' : 'Sign In')
                }
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p><strong>This demo works completely!</strong></p>
              <p>Authentication, sessions, and the full app interface.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}