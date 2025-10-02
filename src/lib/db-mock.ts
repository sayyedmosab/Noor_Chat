// Mock database implementation for development without Docker
// This allows the application to run without PostgreSQL/Redis for initial testing

declare global {
  var mockUsersStore: {
    users: MockUser[]
    counter: number
  }
}

interface MockUser {
  id: number
  email: string
  password_hash: string
  name: string
  role: 'analyst' | 'admin'
  email_verified: boolean
  email_verification_token?: string
  password_reset_token?: string
  password_reset_expires?: Date
  created_at: Date
  updated_at: Date
}

// In-memory storage for mock data 
let mockUsers: MockUser[] = []
let mockUserIdCounter = 1

// Simple session-based persistence (better for development)
global.mockUsersStore = global.mockUsersStore || {
  users: [],
  counter: 1
}

// Load from global store on startup
mockUsers = global.mockUsersStore.users
mockUserIdCounter = global.mockUsersStore.counter

// Save data to global store
function saveMockData() {
  global.mockUsersStore.users = mockUsers
  global.mockUsersStore.counter = mockUserIdCounter
}

// Mock database client
export class MockDB {
  async query(text: string, params: unknown[] = []) {
    // Simulate async database operations
    await new Promise(resolve => setTimeout(resolve, 10))
    
    if (text.includes('CREATE EXTENSION') || text.includes('CREATE TABLE') || text.includes('CREATE INDEX')) {
      // Mock schema creation
      return { rows: [], command: 'CREATE' }
    }
    
    if (text.includes('INSERT INTO users')) {
      // Mock user creation
      const [email, password_hash, name, role, email_verification_token] = params as [string, string, string, 'analyst' | 'admin', string]
      const newUser: MockUser = {
        id: mockUserIdCounter++,
        email,
        password_hash,
        name,
        role: role || 'analyst',
        email_verified: false,
        email_verification_token,
        created_at: new Date(),
        updated_at: new Date(),
      }
      mockUsers.push(newUser)
      saveMockData() // Persist to global store
      console.log('💾 MockDB: Created user', email, 'with ID', newUser.id)
      return {
        rows: [{ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }],
        command: 'INSERT'
      }
    }
    
    if (text.includes('SELECT') && text.includes('FROM users WHERE email')) {
      // Mock user lookup by email
      const email = params[0]
      const user = mockUsers.find(u => u.email === email)
      return {
        rows: user ? [{
          id: user.id,
          email: user.email,
          password_hash: user.password_hash,
          name: user.name,
          role: user.role,
          email_verified: user.email_verified,
        }] : [],
        command: 'SELECT'
      }
    }
    
    if (text.includes('SELECT') && text.includes('FROM users WHERE id')) {
      // Mock user lookup by ID
      const id = params[0]
      console.log('🔍 MockDB: Looking for user ID:', id, 'Total users:', mockUsers.length, 'User emails:', mockUsers.map(u => u.email))
      const user = mockUsers.find(u => u.id === parseInt(id as string))
      console.log('🔍 MockDB: Found user:', user ? { id: user.id, email: user.email, verified: user.email_verified } : 'NOT FOUND')
      return {
        rows: user ? [{
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          email_verified: user.email_verified,
        }] : [],
        command: 'SELECT'
      }
    }
    
    if (text.includes('UPDATE users SET email_verified')) {
      // Mock email verification
      const token = params[0]
      const user = mockUsers.find(u => u.email_verification_token === token)
      if (user) {
        user.email_verified = true
        user.email_verification_token = undefined
        saveMockData() // Persist to global store
        console.log('✅ MockDB: Verified user', user.email)
        return { rows: [{ id: user.id }], command: 'UPDATE' }
      }
      return { rows: [], command: 'UPDATE' }
    }
    
    // Default empty result
    return { rows: [], command: 'SELECT' }
  }
}

export function getMockDB() {
  return new MockDB()
}

// Mock Redis client
export class MockRedis {
  private store = new Map<string, string>()
  
  async connect() {
    // Mock connection
    return Promise.resolve()
  }
  
  async set(key: string, value: string) {
    this.store.set(key, value)
    return 'OK'
  }
  
  async get(key: string) {
    return this.store.get(key) || null
  }
  
  async del(key: string) {
    return this.store.delete(key) ? 1 : 0
  }
}

export function getMockRedis() {
  return new MockRedis()
}