import Redis from 'ioredis'

import { REDIS_CONFIG } from './constants'

// Используем REDIS_URL если доступен (для Docker), иначе отдельные параметры (для локальной разработки)
const redis = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, { lazyConnect: true })
        : new Redis({
                        host: REDIS_CONFIG.host || 'localhost',
                        port: Number(REDIS_CONFIG.port) || 6379,
                        password: REDIS_CONFIG.password || undefined,
                        lazyConnect: true
                })

export default redis
