'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function VerifyDevPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || isLoading) return

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/verify-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setMessage(data.message)
      } else {
        setMessage(data.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setMessage('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🛠️ Development Email Verification</CardTitle>
            <CardDescription>
              Manually verify your email for development testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!success ? (
              <form onSubmit={handleVerify} className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Development Mode:</strong> This tool manually verifies accounts since email sending is not configured yet.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter the email you registered with"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? 'Verifying...' : 'Verify Email'}
                </Button>

                {message && (
                  <Alert variant={success ? "default" : "destructive"}>
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}
              </form>
            ) : (
              <div className="text-center space-y-4">
                <Alert>
                  <AlertDescription className="text-green-700">
                    ✅ {message}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/auth/login">Go to Login</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/">Go to Main App</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}