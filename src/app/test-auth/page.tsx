'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestAuthPage() {
  const [step, setStep] = useState(1)
  const [email] = useState(`test${Date.now()}@example.com`)
  const [password] = useState('test123456')
  const [name] = useState('Test User')
  const [results, setResults] = useState<string[]>([])
  
  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testRegistration = async () => {
    try {
      addResult(`🔄 Testing registration for ${email}`)
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await response.json()
      
      if (response.ok) {
        addResult(`✅ Registration successful: ${data.message}`)
        setStep(2)
      } else {
        addResult(`❌ Registration failed: ${data.error}`)
      }
    } catch (error) {
      addResult(`❌ Registration error: ${error}`)
    }
  }

  const testLogin = async () => {
    try {
      addResult(`🔄 Testing login for ${email}`)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      
      if (response.ok) {
        addResult(`✅ Login successful: ${data.user.name} (${data.user.role})`)
        setStep(3)
      } else {
        addResult(`❌ Login failed: ${data.error}`)
      }
    } catch (error) {
      addResult(`❌ Login error: ${error}`)
    }
  }

  const testMainApp = async () => {
    try {
      addResult(`🔄 Testing main app access`)
      const response = await fetch('/')
      
      if (response.ok) {
        const text = await response.text()
        if (text.includes('Chat + Canvas') && !text.includes('Sign in to Chat + Canvas')) {
          addResult(`✅ Main app accessible! Authentication working.`)
          setStep(4)
        } else {
          addResult(`❌ Main app redirected to login (authentication failed)`)
        }
      } else {
        addResult(`❌ Main app access failed: ${response.status}`)
      }
    } catch (error) {
      addResult(`❌ Main app test error: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🧪 Authentication System Test</CardTitle>
            <CardDescription>
              Comprehensive test of registration, login, and authentication flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg border-2 ${step >= 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <h3 className="font-semibold">Step 1: Registration</h3>
                <p className="text-sm text-gray-600">Create new account</p>
                {step === 1 && (
                  <Button onClick={testRegistration} className="mt-2 w-full">
                    Test Registration
                  </Button>
                )}
                {step > 1 && <span className="text-green-600">✅ Complete</span>}
              </div>
              
              <div className={`p-4 rounded-lg border-2 ${step >= 2 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <h3 className="font-semibold">Step 2: Login</h3>
                <p className="text-sm text-gray-600">Authenticate user</p>
                {step === 2 && (
                  <Button onClick={testLogin} className="mt-2 w-full">
                    Test Login
                  </Button>
                )}
                {step > 2 && <span className="text-green-600">✅ Complete</span>}
              </div>
              
              <div className={`p-4 rounded-lg border-2 ${step >= 3 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                <h3 className="font-semibold">Step 3: Main App</h3>
                <p className="text-sm text-gray-600">Access protected route</p>
                {step === 3 && (
                  <Button onClick={testMainApp} className="mt-2 w-full">
                    Test Main App
                  </Button>
                )}
                {step > 3 && <span className="text-green-600">✅ Complete</span>}
              </div>
            </div>

            {step === 4 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-800">🎉 All Tests Passed!</h3>
                <p className="text-green-700">Authentication system is working correctly.</p>
                <div className="mt-4 space-x-2">
                  <Button asChild>
                    <a href="/">Go to Main App</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/auth/login">Login Page</a>
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Test Credentials:</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input value={email} readOnly placeholder="Email" />
                <Input value={password} readOnly placeholder="Password" />
                <Input value={name} readOnly placeholder="Name" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {results.length === 0 && (
                <div className="text-gray-500">No tests run yet. Click "Test Registration" to start.</div>
              )}
              {results.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}