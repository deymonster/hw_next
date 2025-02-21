import { getRedisService } from "@/services/redis/redis.service"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { userId } = await request.json()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' }, 
      { status: 400 }
    )
  }

  try {
    const redis = getRedisService()
    const sessions = await redis.getUserSessions(userId)
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('[GET_USER_SESSIONS_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to fetch user sessions' },
      { status: 500 }
    )
  }
}