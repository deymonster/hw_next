import redis from '@/services/redis/client'

type TagInfo = {
	name: string
	last_updated: string | null
}

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
				const tags: TagInfo[] = results
					.filter(
						(
							tag: unknown
						): tag is {
							name: string
							last_updated?: string | null
						} =>
							typeof (tag as { name?: unknown })?.name ===
							'string'
					)
					.map(
						(tag: {
							name: string
							last_updated?: string | null
						}): TagInfo => ({
							name: tag.name,
							last_updated:
								typeof tag.last_updated === 'string'
									? tag.last_updated
									: null
						})
					)

				const sorted = tags.sort(
					(a: TagInfo, b: TagInfo) =>
						new Date(b.last_updated ?? 0).getTime() -
						new Date(a.last_updated ?? 0).getTime()
				)
				const preferred =
					sorted.find(tag => tag.name !== 'latest') || sorted[0]
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
		console.error('Failed to fetch version info from Docker Hub', error)
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
