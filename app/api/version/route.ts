import { NextResponse } from 'next/server'

export async function GET() {
	const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
	const commit = process.env.NEXT_PUBLIC_GIT_COMMIT || 'dev'
	const date = process.env.NEXT_PUBLIC_BUILD_DATE || 'unknown'

	return NextResponse.json({
		name: 'hw-monitor-web',
		version,
		commit,
		date,
		nodeEnv: process.env.NODE_ENV || 'development'
	})
}
