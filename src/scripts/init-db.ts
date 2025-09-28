import { initializeDB, getDB } from '@/lib/db'
import { createUser } from '@/lib/auth'

async function main() {
  try {
    console.log('Initializing database...')
    
    // Initialize database schema
    await initializeDB()
    
    // Create admin user if it doesn't exist
    const db = getDB()
    const existingAdmin = await db.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@chatcanvas.local']
    )
    
    if (existingAdmin.rows.length === 0) {
      console.log('Creating admin user...')
      const { user } = await createUser(
        'admin@chatcanvas.local',
        'admin123456',
        'Administrator',
        'admin'
      )
      
      // Auto-verify admin user
      await db.query(
        'UPDATE users SET email_verified = TRUE WHERE id = $1',
        [user.id]
      )
      
      console.log('Admin user created with credentials:')
      console.log('Email: admin@chatcanvas.local')
      console.log('Password: admin123456')
      console.log('Please change the password after first login!')
    } else {
      console.log('Admin user already exists')
    }
    
    console.log('Database initialization complete!')
    process.exit(0)
  } catch (error) {
    console.error('Database initialization failed:', error)
    process.exit(1)
  }
}

main()