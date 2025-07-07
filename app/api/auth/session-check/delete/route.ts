import { NextResponse } from 'next/server'

import { getRedisService } from '@/services/redis/redis.service'

export async function POST(request: Request) {
	const { userId, sessionId } = await request.json()

	try {
		const redis = getRedisService()
		await redis.deleteUserSession(userId, sessionId)
		return NextResponse.json({ success: true })
	} catch (error) {
		console.error('Session deletion error:', error)
		return NextResponse.json({ success: false })
	}
}
