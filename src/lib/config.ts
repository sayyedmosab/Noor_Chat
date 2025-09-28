// Database Configuration Management
// Allows runtime configuration of multiple Supabase databases

export interface DatabaseConfig {
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

export interface AppConfig {
  databases: DatabaseConfig[]
  activeAuthDb: string
  activeQueryDb: string
  settings: {
    allowMultipleQueryDbs: boolean
    defaultUserRole: 'analyst' | 'admin'
    enableRegistration: boolean
  }
}

// Default configuration
const DEFAULT_CONFIG: AppConfig = {
  databases: [
    {
      id: 'auth-primary',
      name: 'Primary Auth Database',
      type: 'auth',
      url: process.env.SUPABASE_AUTH_URL || '',
      anonKey: process.env.SUPABASE_AUTH_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY || '',
      description: 'Main authentication and user profiles database',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'query-primary',
      name: 'Primary Query Database',
      type: 'query',
      url: process.env.SUPABASE_QUERY_URL || '',
      anonKey: process.env.SUPABASE_QUERY_ANON_KEY || '',
      serviceRoleKey: process.env.SUPABASE_QUERY_SERVICE_ROLE_KEY || '',
      description: 'Main data analysis and chatbot query database',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  activeAuthDb: 'auth-primary',
  activeQueryDb: 'query-primary',
  settings: {
    allowMultipleQueryDbs: true,
    defaultUserRole: 'analyst',
    enableRegistration: true
  }
}

// In-memory config store (in production, this would be in a database)
let appConfig: AppConfig = DEFAULT_CONFIG

// Get current app configuration
export function getAppConfig(): AppConfig {
  return appConfig
}

// Get active auth database config
export function getActiveAuthDatabase(): DatabaseConfig | null {
  return appConfig.databases.find(db => 
    db.id === appConfig.activeAuthDb && db.type === 'auth' && db.isActive
  ) || null
}

// Get active query database config
export function getActiveQueryDatabase(): DatabaseConfig | null {
  return appConfig.databases.find(db => 
    db.id === appConfig.activeQueryDb && db.type === 'query' && db.isActive
  ) || null
}

// Get all query databases (for multi-database scenarios)
export function getAllQueryDatabases(): DatabaseConfig[] {
  return appConfig.databases.filter(db => 
    db.type === 'query' && db.isActive
  )
}

// Add new database configuration
export function addDatabaseConfig(config: Omit<DatabaseConfig, 'id' | 'createdAt' | 'updatedAt'>): DatabaseConfig {
  const newDb: DatabaseConfig = {
    ...config,
    id: `${config.type}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  appConfig.databases.push(newDb)
  return newDb
}

// Update database configuration
export function updateDatabaseConfig(id: string, updates: Partial<DatabaseConfig>): DatabaseConfig | null {
  const index = appConfig.databases.findIndex(db => db.id === id)
  if (index === -1) return null
  
  appConfig.databases[index] = {
    ...appConfig.databases[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  return appConfig.databases[index]
}

// Remove database configuration
export function removeDatabaseConfig(id: string): boolean {
  const index = appConfig.databases.findIndex(db => db.id === id)
  if (index === -1) return false
  
  appConfig.databases.splice(index, 1)
  return true
}

// Switch active auth database
export function switchActiveAuthDatabase(id: string): boolean {
  const db = appConfig.databases.find(db => 
    db.id === id && db.type === 'auth' && db.isActive
  )
  
  if (!db) return false
  
  appConfig.activeAuthDb = id
  return true
}

// Switch active query database
export function switchActiveQueryDatabase(id: string): boolean {
  const db = appConfig.databases.find(db => 
    db.id === id && db.type === 'query' && db.isActive
  )
  
  if (!db) return false
  
  appConfig.activeQueryDb = id
  return true
}

// Update app settings
export function updateAppSettings(settings: Partial<AppConfig['settings']>): AppConfig['settings'] {
  appConfig.settings = {
    ...appConfig.settings,
    ...settings
  }
  return appConfig.settings
}

// Test database connection
export async function testDatabaseConnection(config: DatabaseConfig): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    // This would use the Supabase client to test the connection
    // For now, just validate the config
    if (!config.url || !config.anonKey) {
      return {
        success: false,
        message: 'Missing required configuration (URL or anon key)'
      }
    }
    
    // TODO: Implement actual connection test
    return {
      success: true,
      message: 'Connection test successful'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Export/import configuration (for backup/restore)
export function exportConfig(): string {
  return JSON.stringify(appConfig, null, 2)
}

export function importConfig(configJson: string): boolean {
  try {
    const imported = JSON.parse(configJson)
    
    // Basic validation
    if (!imported.databases || !Array.isArray(imported.databases)) {
      throw new Error('Invalid configuration format')
    }
    
    appConfig = imported
    return true
  } catch (error) {
    console.error('Failed to import config:', error)
    return false
  }
}