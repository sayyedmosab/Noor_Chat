'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DatabaseConfig {
  id: string
  name: string
  type: 'auth' | 'query'
  url: string
  anonKey: string
  serviceRoleKey?: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AppConfig {
  databases: DatabaseConfig[]
  activeAuthDb: string
  activeQueryDb: string
  settings: {
    allowMultipleQueryDbs: boolean
    defaultUserRole: 'analyst' | 'admin'
    enableRegistration: boolean
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'databases' | 'general'>('databases')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDb, setNewDb] = useState({
    name: '',
    type: 'query' as 'auth' | 'query',
    url: '',
    anonKey: '',
    serviceRoleKey: '',
    description: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/databases')
      
      if (response.status === 403) {
        router.push('/auth/login?message=Admin access required')
        return
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load configuration')
      }
      
      setConfig({
        databases: data.databases,
        activeAuthDb: data.activeAuthDb,
        activeQueryDb: data.activeQueryDb,
        settings: data.settings
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleDatabaseAction = async (action: string, data?: any) => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Action failed')
      }

      // Refresh config after successful action
      await loadConfig()
      
      if (action === 'add') {
        setShowAddForm(false)
        setNewDb({ name: '', type: 'query', url: '', anonKey: '', serviceRoleKey: '', description: '' })
      }
      
      // Show success message
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async (dbId: string) => {
    try {
      setSaving(true)
      await handleDatabaseAction('test', { id: dbId })
    } catch (err) {
      // Error is already handled in handleDatabaseAction
    }
  }

  const switchDatabase = async (type: 'auth' | 'query', dbId: string) => {
    const action = type === 'auth' ? 'switch_auth' : 'switch_query'
    await handleDatabaseAction(action, { id: dbId })
  }

  const addDatabase = async () => {
    if (!newDb.name || !newDb.url || !newDb.anonKey) {
      setError('Please fill in all required fields')
      return
    }
    
    await handleDatabaseAction('add', newDb)
  }

  const removeDatabase = async (dbId: string) => {
    if (!confirm('Are you sure you want to remove this database configuration?')) {
      return
    }
    
    await handleDatabaseAction('remove', { id: dbId })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load configuration</p>
          {error && <p className="text-sm text-gray-600 mt-2">{error}</p>}
          <button 
            onClick={loadConfig}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage database connections and application settings</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to App
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('databases')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'databases'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Database Configuration
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              General Settings
            </button>
          </nav>
        </div>

        {/* Database Configuration Tab */}
        {activeTab === 'databases' && (
          <div className="space-y-8">
            {/* Current Active Databases */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Databases</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-green-700 mb-2">🔐 Auth Database</h3>
                  <p className="text-sm text-gray-600 mb-2">Currently active for user authentication</p>
                  {config.databases
                    .filter(db => db.id === config.activeAuthDb)
                    .map(db => (
                      <div key={db.id} className="bg-green-50 rounded p-3">
                        <p className="font-medium">{db.name}</p>
                        <p className="text-xs text-gray-600">{db.url}</p>
                        <p className="text-xs text-gray-500">Updated: {new Date(db.updatedAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-blue-700 mb-2">📊 Query Database</h3>
                  <p className="text-sm text-gray-600 mb-2">Currently active for data analysis</p>
                  {config.databases
                    .filter(db => db.id === config.activeQueryDb)
                    .map(db => (
                      <div key={db.id} className="bg-blue-50 rounded p-3">
                        <p className="font-medium">{db.name}</p>
                        <p className="text-xs text-gray-600">{db.url}</p>
                        <p className="text-xs text-gray-500">Updated: {new Date(db.updatedAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* All Databases */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">All Database Configurations</h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={saving}
                >
                  + Add Database
                </button>
              </div>

              {/* Add Database Form */}
              {showAddForm && (
                <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium mb-4">Add New Database</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={newDb.name}
                        onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="My Database"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select
                        value={newDb.type}
                        onChange={(e) => setNewDb({ ...newDb, type: e.target.value as 'auth' | 'query' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="query">Query Database</option>
                        <option value="auth">Auth Database</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supabase URL *</label>
                      <input
                        type="url"
                        value={newDb.url}
                        onChange={(e) => setNewDb({ ...newDb, url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="https://your-project.supabase.co"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Anon Key *</label>
                      <input
                        type="password"
                        value={newDb.anonKey}
                        onChange={(e) => setNewDb({ ...newDb, anonKey: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="eyJ..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Role Key</label>
                      <input
                        type="password"
                        value={newDb.serviceRoleKey}
                        onChange={(e) => setNewDb({ ...newDb, serviceRoleKey: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="eyJ... (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={newDb.description}
                        onChange={(e) => setNewDb({ ...newDb, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Description of this database"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={addDatabase}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Adding...' : 'Add Database'}
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Database List */}
              <div className="space-y-4">
                {config.databases.map((db) => (
                  <div key={db.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium">{db.name}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            db.type === 'auth' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {db.type === 'auth' ? '🔐 Auth' : '📊 Query'}
                          </span>
                          {(db.id === config.activeAuthDb || db.id === config.activeQueryDb) && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                              ✓ Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{db.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-1">{db.url}</p>
                        <p className="text-xs text-gray-400">
                          Created: {new Date(db.createdAt).toLocaleDateString()} | 
                          Updated: {new Date(db.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => testConnection(db.id)}
                          disabled={saving}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          Test
                        </button>
                        {db.type === 'auth' && db.id !== config.activeAuthDb && (
                          <button
                            onClick={() => switchDatabase('auth', db.id)}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            Use as Auth
                          </button>
                        )}
                        {db.type === 'query' && db.id !== config.activeQueryDb && (
                          <button
                            onClick={() => switchDatabase('query', db.id)}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Use as Query
                          </button>
                        )}
                        {db.id !== config.activeAuthDb && db.id !== config.activeQueryDb && (
                          <button
                            onClick={() => removeDatabase(db.id)}
                            disabled={saving}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.settings.allowMultipleQueryDbs}
                    className="rounded border-gray-300"
                    readOnly
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow Multiple Query Databases</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Enable switching between multiple data analysis databases</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default User Role</label>
                <select 
                  value={config.settings.defaultUserRole}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  readOnly
                >
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Role assigned to new users by default</p>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.settings.enableRegistration}
                    className="rounded border-gray-300"
                    readOnly
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable User Registration</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Allow new users to create accounts</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500">
                <strong>Note:</strong> General settings modification will be available in a future update.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}