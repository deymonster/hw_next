import { NextResponse } from "next/server"
import { headers } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const headersList = await headers()
        const userAgent = headersList.get('user-agent') || 'Unknown'
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
                  headersList.get('x-real-ip') || 
                  'Unknown'

        // const geoData = ip !== 'Unknown' ? await getGeoData(ip) : null

        const metadata = {
            device: {
                browser: getBrowserInfo(userAgent),
                os: getOSInfo(userAgent),
                type: getDeviceType(userAgent),
                userAgent: userAgent
            },
            network: {
                ip: ip,
                // location: geoData ? {
                //     country: geoData.country_name,
                //     city: geoData.city,
                //     timezone: geoData.timezone
                // } : undefined
            }
        }
        
        return NextResponse.json({ metadata })
    } catch (error) {
        console.error('[METADATA_ERROR]', error)
        return NextResponse.json({ error: 'Failed to process metadata' }, { status: 500 })
    }
}

function getBrowserInfo(ua: string) {
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
}

function getOSInfo(ua: string) {
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac OS')) return 'MacOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS')) return 'iOS'
    return 'Unknown'
}

function getDeviceType(ua: string) {
    if (ua.includes('Mobile')) return 'mobile'
    if (ua.includes('Tablet')) return 'tablet'
    return 'desktop'
}


async function getGeoData(ip: string) {
    const testIP = '8.8.8.8'
    const response = await fetch(`http://ip-api.com/json/${testIP}`)
    const data = await response.json()
    console.log('Geo Data:', data) // Для отладки
    return data
}