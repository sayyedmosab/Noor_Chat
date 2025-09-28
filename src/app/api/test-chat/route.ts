import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'Chat system operational',
    features: [
      '✅ Chat UI implemented',
      '✅ Gemini API integration',
      '✅ Database query engine',
      '✅ Natural language to SQL',
      '⏳ Needs sample data setup'
    ],
    timestamp: new Date().toISOString(),
    urls: {
      chat: '/chat',
      api: {
        chat: '/api/chat',
        query: '/api/query'
      }
    }
  })
}