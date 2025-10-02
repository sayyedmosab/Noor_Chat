import { ChatInterface } from '@/components/chat/ChatInterface'
import { Header } from '@/components/layout/header'
import { getCurrentUser, requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const user = await requireAuth()
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Data Analysis Chat</h1>
                <p className="text-sm text-gray-600">
                  Ask questions about your data in natural language
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-green-800">Connected</span>
                </div>
                <div className="text-xs text-gray-500">
                  Mode: {user.role === 'admin' ? 'Super Admin' : 'Super Analyst'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat Interface Component */}
          <ChatInterface user={user} />
        </div>
        
        {/* Sidebar for Context/Tools */}
        <div className="w-80 bg-white border-l">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">Context & Tools</h2>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Database Status */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Database Status</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span>Auth DB</span>
                  <span className="text-green-600">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Query DB</span>
                  <span className="text-yellow-600">Checking...</span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
              <div className="space-y-1">
                <button className="w-full text-left text-xs text-blue-600 hover:text-blue-800 py-1">
                  📊 Show available tables
                </button>
                <button className="w-full text-left text-xs text-blue-600 hover:text-blue-800 py-1">
                  🔍 Analyze sample data
                </button>
                <button className="w-full text-left text-xs text-blue-600 hover:text-blue-800 py-1">
                  📈 Generate summary report
                </button>
              </div>
            </div>
            
            {/* User Permissions */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Access</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
                  }`}></span>
                  <span>{user.role === 'admin' ? 'Full Admin Access' : 'Read-Only Analysis'}</span>
                </div>
                <div className="text-gray-500">
                  {user.role === 'admin' 
                    ? 'Can modify data and settings' 
                    : 'Can query and analyze data'}
                </div>
              </div>
            </div>
            
            {/* Recent Queries */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Queries</h3>
              <div className="text-xs text-gray-500">
                No recent queries yet. Start chatting to see your query history!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}