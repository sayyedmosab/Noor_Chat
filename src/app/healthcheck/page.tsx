export default function HealthCheck() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🟢 Chat + Canvas Health Check</h1>
      <p>✅ Server is running successfully!</p>
      <p>✅ Next.js compilation working</p>
      <p>✅ TypeScript processing correctly</p>
      <p>✅ Ready for full application</p>
      <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '5px' }}>
        <strong>Status:</strong> All systems operational
      </div>
      <div style={{ marginTop: '20px' }}>
        <a href="/auth/login" style={{ padding: '10px 20px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
          Go to Login
        </a>
      </div>
    </div>
  )
}