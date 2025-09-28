'use client'
import { useState, useEffect } from 'react'

interface StatusCheck {
  name: string
  status: 'checking' | 'success' | 'error' | 'warning'
  message: string
  details?: string
  action?: string
}

export default function SetupStatusPage() {
  const [checks, setChecks] = useState<StatusCheck[]>([
    { name: 'Auth Database Connection', status: 'checking', message: 'Testing connection...' },
    { name: 'Query Database Connection', status: 'checking', message: 'Testing connection...' },
    { name: 'Users Table', status: 'checking', message: 'Checking table existence...' },
    { name: 'Authentication Flow', status: 'checking', message: 'Testing auth system...' },
  ])

  useEffect(() => {
    runStatusChecks()
  }, [])

  const runStatusChecks = async () => {
    // Check Supabase connections
    try {
      const response = await fetch('/api/test/supabase')
      const data = await response.json()
      
      if (data.connections) {
        updateCheck('Auth Database Connection', 
          data.connections.authDB ? 'success' : 'error',
          data.connections.authDB ? 'Connected successfully' : 'Connection failed',
          data.connections.authDB ? undefined : 'Service role key may be incorrect'
        )
        
        updateCheck('Query Database Connection',
          data.connections.queryDB ? 'success' : 'error', 
          data.connections.queryDB ? 'Connected successfully' : 'Connection failed',
          data.connections.queryDB ? undefined : 'Service role key may be incorrect'
        )
      }
    } catch (error) {
      updateCheck('Auth Database Connection', 'error', 'Failed to test connection')
      updateCheck('Query Database Connection', 'error', 'Failed to test connection')
    }

    // Check users table
    try {
      const response = await fetch('/api/test/auth-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_connection' })
      })
      const data = await response.json()
      
      updateCheck('Users Table',
        data.canAccessUsersTable ? 'success' : 'warning',
        data.canAccessUsersTable ? 'Users table exists' : 'Users table needs to be created',
        data.canAccessUsersTable ? undefined : 'Create table in Supabase Dashboard'
      )
    } catch (error) {
      updateCheck('Users Table', 'error', 'Failed to check users table')
    }

    // Test authentication flow
    updateCheck('Authentication Flow', 'warning', 'Ready for testing after users table creation')
  }

  const updateCheck = (name: string, status: StatusCheck['status'], message: string, details?: string) => {
    setChecks(prev => prev.map(check => 
      check.name === name ? { ...check, status, message, details } : check
    ))
  }

  const getStatusIcon = (status: StatusCheck['status']) => {
    switch (status) {
      case 'checking': return '🔍'
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
    }
  }

  const getStatusColor = (status: StatusCheck['status']) => {
    switch (status) {
      case 'checking': return 'text-blue-600'
      case 'success': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🚀 Chat + Canvas - Setup Status
          </h1>
          
          <div className="space-y-4">
            {checks.map((check) => (
              <div key={check.name} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getStatusIcon(check.status)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{check.name}</h3>
                    <p className={`text-sm ${getStatusColor(check.status)}`}>{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-gray-600 mt-1">{check.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold text-blue-800 mb-3">📋 Next Steps Required:</h2>
            <div className="space-y-2 text-sm text-blue-700">
              <div className="flex items-start space-x-2">
                <span>1.</span>
                <div>
                  <strong>Create Profiles Table + Policies in Auth Database:</strong>
                  <p className="mt-1">Go to Supabase Dashboard → Auth Database → SQL Editor and run:</p>
                  <pre className="mt-2 p-2 bg-blue-100 rounded text-xs overflow-x-auto max-h-48">
{`-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'analyst' CHECK (role IN ('analyst', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'New User'), 'analyst');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`}
                  </pre>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span>2.</span>
                <div>
                  <strong>Test Authentication:</strong>
                  <p>After creating the table, test user registration and login</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span>3.</span>
                <div>
                  <strong>Implement Chat + Canvas Features:</strong>
                  <p>Database connector, analyst mode, and canvas visualization</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <button 
              onClick={runStatusChecks}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              🔄 Refresh Status
            </button>
            <a 
              href="/auth/register" 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              ➡️ Go to Registration
            </a>
            <a 
              href="/test-auth" 
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              🧪 Test Authentication
            </a>
            <a 
              href="/api/test/supabase-auth" 
              target="_blank"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              🔍 Supabase Auth API
            </a>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🗄️ Database Architecture</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-green-700 mb-2">🔐 Auth Database (Supabase)</h3>
              <p className="text-sm text-gray-600 mb-2">Uses Supabase built-in authentication + profiles</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• auth.users (built-in Supabase auth)</li>
                <li>• public.profiles (user metadata)</li>
                <li>• Database sources configuration</li>
                <li>• Document sources configuration</li>
                <li>• Canvas artifacts</li>
                <li>• Audit logs (user actions)</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-blue-700 mb-2">📊 Query Database (Supabase)</h3>
              <p className="text-sm text-gray-600 mb-2">For chatbot analysis and data queries</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• User-defined database schemas</li>
                <li>• Analysis query execution</li>
                <li>• Data exploration and insights</li>
                <li>• Read-only access for analysts</li>
                <li>• Admin access for schema operations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}