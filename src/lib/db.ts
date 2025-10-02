import { Pool } from 'pg'
import Redis from 'redis'
import { getMockRedis } from './db-mock'

// Check if we should use mock implementations
const useMock = process.env.SKIP_DB_CONNECTION === 'true'

// Database connection pools - dual database architecture
let authPool: Pool | null = null
let queryPool: Pool | null = null

// Auth Database Connection (for user authentication)
export function getAuthDB() {
  if (useMock) {
    console.log('Mock mode enabled - no real database connections')
    return null
  }
  
  if (!authPool) {
    authPool = new Pool({
      connectionString: process.env.AUTH_DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return authPool
}

// Query Database Connection (for chatbot analysis)
export function getQueryDB() {
  if (useMock) {
    console.log('Mock mode enabled - no real database connections')
    return null
  }
  
  if (!queryPool) {
    queryPool = new Pool({
      connectionString: process.env.QUERY_DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return queryPool
}

// Legacy function - uses auth database for backward compatibility
export function getDB() {
  return getAuthDB()
}

// Redis connection
let redis: ReturnType<typeof Redis.createClient> | null = null

export function getRedis() {
  if (useMock) {
    return getMockRedis()
  }
  
  if (!redis) {
    redis = Redis.createClient({
      url: process.env.REDIS_URL,
    })
    redis.connect().catch(console.error)
  }
  return redis
}

// Database schema initialization
export async function initializeDB() {
  if (useMock) {
    console.log('Mock mode enabled - skipping database schema creation')
    return
  }
  
  console.log('Initializing dual database schema...')
  
  // Initialize Auth Database
  const authDB = getAuthDB()
  if (!authDB) {
    throw new Error('Auth database connection failed')
  }
  
  console.log('Setting up auth database schema...')
  
  // Enable pgvector extension on auth database
  try {
    await authDB.query('CREATE EXTENSION IF NOT EXISTS vector;')
  } catch (error) {
    console.warn('Could not create vector extension on auth DB:', error)
  }
  
  // Create users table (Auth Database)
  await authDB.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'analyst' CHECK (role IN ('analyst', 'admin')),
      email_verified BOOLEAN DEFAULT FALSE,
      email_verification_token VARCHAR(255),
      password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Create database sources table (Auth Database - stores connection configs)
  await authDB.query(`
    CREATE TABLE IF NOT EXISTS db_sources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'postgres',
      host VARCHAR(255) NOT NULL,
      port INTEGER DEFAULT 5432,
      database_name VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      ssl BOOLEAN DEFAULT TRUE,
      default_mode VARCHAR(50) DEFAULT 'analyst' CHECK (default_mode IN ('analyst', 'admin')),
      allow_schemas TEXT[], -- JSON array of allowed schemas
      deny_tables TEXT[], -- JSON array of denied tables
      row_limit INTEGER DEFAULT 10000,
      timeout_seconds INTEGER DEFAULT 30,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Create document sources table (Auth Database - stores doc configs)
  await authDB.query(`
    CREATE TABLE IF NOT EXISTS doc_sources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('folder', 's3', 'supabase_storage')),
      config JSONB NOT NULL, -- Connection configuration
      include_globs TEXT[],
      exclude_globs TEXT[],
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Create audit logs table (Auth Database - tracks user actions)
  await authDB.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      action VARCHAR(255) NOT NULL,
      sql_statement TEXT,
      explain_output JSONB,
      result_summary JSONB,
      success BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Create artifacts table (Auth Database - Canvas outputs)
  await authDB.query(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('chart', 'table', 'report', 'schema')),
      content JSONB NOT NULL,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Create embeddings table (Auth Database - document search)
  await authDB.query(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id SERIAL PRIMARY KEY,
      doc_source_id INTEGER REFERENCES doc_sources(id),
      file_path VARCHAR(1000) NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB,
      embedding VECTOR(1536), -- OpenAI ada-002 dimensions
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Create indexes for better performance (Auth Database)
  await authDB.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);')
  await authDB.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);')
  await authDB.query('CREATE INDEX IF NOT EXISTS idx_embeddings_doc_source ON embeddings(doc_source_id);')
  try {
    await authDB.query('CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);')
  } catch (error) {
    console.warn('Could not create vector index (pgvector not available):', error)
  }
  
  // Initialize Query Database
  const queryDB = getQueryDB()
  if (!queryDB) {
    throw new Error('Query database connection failed')
  }
  
  console.log('Setting up query database schema...')
  
  // Enable pgvector extension on query database
  try {
    await queryDB.query('CREATE EXTENSION IF NOT EXISTS vector;')
  } catch (error) {
    console.warn('Could not create vector extension on query DB:', error)
  }
  
  // Add any query-specific tables here if needed
  // For now, this database is used for analysis queries on existing schemas
  
  console.log('Dual database schema initialized successfully')
  console.log('Auth Database: Ready for user authentication and app metadata')
  console.log('Query Database: Ready for chatbot analysis and data queries')
}