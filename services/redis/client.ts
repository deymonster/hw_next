import Redis from 'ioredis'

import { REDIS_CONFIG } from './constants'

const redis = new Redis({
	host: REDIS_CONFIG.host || 'localhost',
	port: Number(REDIS_CONFIG.port) || 6379,
	password: REDIS_CONFIG.password || undefined
})

export default redis
