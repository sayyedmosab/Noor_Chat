import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { Header } from '@/components/layout/header'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getCurrentUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      
      <main className="container mx-auto px-4 py-8">
        {user ? (
          <AuthenticatedView user={user} />
        ) : (
          <UnauthenticatedView />
        )}
      </main>
    </div>
  )
}

function UnauthenticatedView() {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Chat + Canvas
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your intelligent data analysis companion with natural language chat and dynamic canvas visualization
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link 
            href="/auth/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Get Started
          </Link>
          <Link 
            href="/auth/login"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-4">💬</div>
          <h3 className="text-lg font-semibold mb-2">Natural Language Chat</h3>
          <p className="text-gray-600 text-sm">
            Ask questions about your data in plain English and get intelligent insights powered by AI
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">Dynamic Canvas</h3>
          <p className="text-gray-600 text-sm">
            Visualize data through interactive charts, tables, and diagrams generated automatically
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold mb-2">Multi-Database Support</h3>
          <p className="text-gray-600 text-sm">
            Connect to multiple databases and document sources for comprehensive analysis
          </p>
        </div>
      </div>
    </div>
  )
}

import { AppUser } from '@/lib/auth';

function AuthenticatedView({ user }: { user: AppUser }) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user.full_name}!
        </h1>
        <p className="text-gray-600 mb-6">
          Ready to analyze your data? Choose an option below to get started.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/chat"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center group"
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="font-medium">Start Chat</h3>
            <p className="text-sm text-gray-600">Begin data conversation</p>
          </Link>
          
          <Link
            href="/canvas"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center group"
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎨</div>
            <h3 className="font-medium">Open Canvas</h3>
            <p className="text-sm text-gray-600">Create visualizations</p>
          </Link>
          
          <Link
            href="/sources"
            className="p-4 border rounded-lg hover:bg-gray-50 text-center group"
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🔗</div>
            <h3 className="font-medium">Data Sources</h3>
            <p className="text-sm text-gray-600">Manage connections</p>
          </Link>
          
          {user.role === 'admin' && (
            <Link
              href="/settings"
              className="p-4 border rounded-lg hover:bg-gray-50 text-center group"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
              <h3 className="font-medium">Settings</h3>
              <p className="text-sm text-gray-600">Admin configuration</p>
            </Link>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 Quick Actions</h2>
          <div className="space-y-3">
            <Link 
              href="/setup-status"
              className="block p-3 border rounded hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span>Check Setup Status</span>
                <span className="text-sm text-gray-500">→</span>
              </div>
            </Link>
            <Link 
              href="/test-auth"
              className="block p-3 border rounded hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span>Test Authentication</span>
                <span className="text-sm text-gray-500">→</span>
              </div>
            </Link>
            <Link 
              href="/api/setup/migration"
              className="block p-3 border rounded hover:bg-gray-50"
              target="_blank"
            >
              <div className="flex items-center justify-between">
                <span>Database Migration SQL</span>
                <span className="text-sm text-gray-500">↗</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Implementation Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span>Dual Supabase Database Architecture</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span>Modern Authentication (@supabase/ssr)</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span>Configurable Database Settings</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              <span>Admin Role & Middleware Protection</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-500 mr-2">⏳</span>
              <span>Chat Interface (Phase 2)</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-500 mr-2">⏳</span>
              <span>Canvas Visualization (Phase 2)</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-500 mr-2">⏳</span>
              <span>Database Connector (Phase 2)</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">👤 Your Account</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Email:</span> {user.email}
          </div>
          <div>
            <span className="font-medium">Username:</span> {user.username}
          </div>
          <div>
            <span className="font-medium">Role:</span> 
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              user.role === 'admin' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user.role === 'admin' ? '🔧 Admin' : '📊 Analyst'}
            </span>
          </div>
          <div>
            <span className="font-medium">Access Level:</span> {user.role === 'admin' ? 'Full System Access' : 'Data Analysis Only'}
          </div>
        </div>
      </div>
    </div>
  )
}