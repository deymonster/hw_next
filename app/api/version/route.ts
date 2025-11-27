import { NextResponse } from 'next/server'

import { getVersionInfo } from '@/lib/version'

export async function GET() {
	const versionInfo = await getVersionInfo()
	return NextResponse.json(versionInfo)
}
