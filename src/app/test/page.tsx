export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-4">
          🎉 Chat + Canvas is LIVE!
        </h1>
        <p className="text-gray-600 text-center mb-6">
          The application is running successfully. Here's what you can do:
        </p>
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">✅ Authentication</h3>
            <p className="text-blue-600 text-sm">Register new accounts and login system working</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">✅ Chat Interface</h3>
            <p className="text-green-600 text-sm">AI chat system with message handling</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">✅ Canvas Panel</h3>
            <p className="text-purple-600 text-sm">Visualization and data display panels</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">✅ Settings</h3>
            <p className="text-orange-600 text-sm">Database and document source configuration</p>
          </div>
        </div>
        <div className="mt-8 space-y-2">
          <a 
            href="/auth/register" 
            className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Account
          </a>
          <a 
            href="/auth/login" 
            className="block w-full bg-gray-600 text-white text-center py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Login
          </a>
        </div>
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Phase 1 Complete ✅</p>
          <p>Ready for Phase 2 Development 🚀</p>
        </div>
      </div>
    </div>
  )
}