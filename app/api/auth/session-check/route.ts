import { getRedisService } from "@/services/redis/redis.service"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { sessionId } = await request.json()
  console.log('[Session Check] Received sessionId:', sessionId)
  console.log('[Session Check] Looking for key:', `session-info:${sessionId}`)
  try {
    const redis = getRedisService()
    const session = await redis.getSession(sessionId)

    console.log('[Session Check] Redis response:', session)
    
    if (!session || !session.isActive) {
      console.log('[Session Check] Session invalid:', { exists: !!session, isActive: session?.isActive }) 
      return NextResponse.json({ valid: false })
    }
    
    await redis.updateSessionActivity(sessionId)
    console.log('[Session Check] Session valid and updated')
    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ valid: false })
  }
}

