export default function SimplePage() {
  return (
    <html>
      <head>
        <title>Chat + Canvas - Working!</title>
        <style>{`
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #333; text-align: center; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .links { margin-top: 30px; }
          .links a { 
            display: block; 
            background: #007bff; 
            color: white; 
            padding: 12px 20px; 
            text-decoration: none; 
            margin: 10px 0; 
            border-radius: 5px; 
            text-align: center; 
          }
          .links a:hover { background: #0056b3; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>🎉 Chat + Canvas Application</h1>
          <div className="success">
            <strong>✅ SUCCESS!</strong> The application is running successfully.
          </div>
          
          <h2>What's Working:</h2>
          <ul>
            <li>✅ Next.js 15.5.4 with TypeScript</li>
            <li>✅ Authentication system (Argon2id + JWT)</li>
            <li>✅ Chat interface with AI placeholder</li>
            <li>✅ Canvas panel with 4 tabs</li>
            <li>✅ Settings for DB and document sources</li>
            <li>✅ Mock database for development</li>
            <li>✅ Responsive UI with Tailwind CSS</li>
          </ul>

          <h2>Test the Features:</h2>
          <div className="links">
            <a href="/auth/register">📝 Create New Account</a>
            <a href="/auth/login">🔐 Login to Existing Account</a>
            <a href="/">🏠 Main Application (requires login)</a>
            <a href="/settings">⚙️ Settings Page (requires login)</a>
          </div>

          <div className="success" style={{marginTop: '40px'}}>
            <strong>Phase 1 Complete!</strong><br/>
            Ready to implement Phase 2: Database connections and AI functionality.
          </div>
        </div>
      </body>
    </html>
  )
}