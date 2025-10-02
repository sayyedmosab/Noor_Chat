import Link from 'next/link'
import { Header } from '@/components/layout/header'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={null} />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. Admin privileges are required.
            </p>
            
            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go Home
              </Link>
              <Link
                href="/auth/logout"
                className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}