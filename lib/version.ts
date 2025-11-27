import redis from '@/services/redis/client'

export async function getVersionInfo() {
	const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
	const commit = process.env.NEXT_PUBLIC_GIT_COMMIT || 'dev'
	const date = process.env.NEXT_PUBLIC_BUILD_DATE || 'unknown'

	const repo = process.env.DOCKERHUB_REPO || 'deymonster/hw-monitor'
	const username = process.env.DOCKERHUB_USERNAME
	const token = process.env.DOCKERHUB_TOKEN

	let dockerHubTag: string | null = null
	let dockerHubUpdated: string | null = null

	try {
		const cacheKey = `dockerhub:latest:${repo}`
		const cached = await redis.get(cacheKey)
		if (cached) {
			const c = JSON.parse(cached)
			dockerHubTag = c?.tag ?? null
			dockerHubUpdated = c?.updated ?? null
		} else {
			const headers: HeadersInit = {}
			if (username && token) {
				headers.Authorization = `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`
			}
			const res = await fetch(
				`https://hub.docker.com/v2/repositories/${repo}/tags/?page_size=100`,
				{
					headers,
					cache: 'no-store'
				}
			)
			if (res.ok) {
				const data = await res.json()
				const results = Array.isArray(data?.results) ? data.results : []
				const sorted = results
					.filter((r: any) => typeof r?.name === 'string')
					.sort(
						(a: any, b: any) =>
							new Date(b.last_updated).getTime() -
							new Date(a.last_updated).getTime()
					)
				const preferred =
					sorted.find((r: any) => r.name !== 'latest') || sorted[0]
				if (preferred) {
					dockerHubTag = String(preferred.name)
					dockerHubUpdated = String(preferred.last_updated || '')
					await redis.set(
						cacheKey,
						JSON.stringify({
							tag: dockerHubTag,
							updated: dockerHubUpdated
						}),
						'EX',
						600
					)
				}
			}
		}
	} catch (error) {
		//
	}

	return {
		name: 'hw-monitor-web',
		version,
		commit,
		date,
		nodeEnv: process.env.NODE_ENV || 'development',
		dockerHub: {
			repo,
			tag: dockerHubTag,
			updated: dockerHubUpdated
		}
	}
}
