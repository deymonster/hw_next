import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// Убираем импорт WebpackObfuscator
// import WebpackObfuscator from 'webpack-obfuscator'

const withNextIntl = createNextIntlPlugin('./libs/i18n/request.ts')

// Получаем IP-адрес сервера из переменной окружения
const serverIpEnv = process.env.NEXT_PUBLIC_SERVER_IP
const serverIp = serverIpEnv ? serverIpEnv.trim() : '192.168.1.1'

// Базовый URL для статики (nginx со /uploads), например: http://localhost:8081 или http://localhost:8084
const rawUploadsBaseUrl = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL
const uploadsBaseUrl = rawUploadsBaseUrl
	? rawUploadsBaseUrl.trim().replace(/\/+$/, '')
	: 'http://localhost:8081'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	output: 'standalone',
	poweredByHeader: false,
	images: {
		remotePatterns: [
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '3000',
				pathname: '/uploads/**'
			},
			{
				protocol: 'http',
				hostname: serverIp,
				port: '3000',
				pathname: '/uploads/**'
			},
			// Разрешаем загрузку картинок с nginx (абсолютные URL)
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '8081',
				pathname: '/uploads/**'
			},
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '8084',
				pathname: '/uploads/**'
			},
			{
				protocol: 'http',
				hostname: serverIp,
				port: '8081',
				pathname: '/uploads/**'
			},
			{
				protocol: 'http',
				hostname: serverIp,
				port: '8084',
				pathname: '/uploads/**'
			}
		]
	},
	// Добавляем rewrites для проксирования запросов к uploads
	async rewrites() {
		return [
			{
				source: '/uploads/:path*',
				destination: `${uploadsBaseUrl}/uploads/:path*`
			}
		]
	},
	// Добавляем глобальные настройки CORS
	async headers() {
		return [
			{
				source: '/api/:path*',
				headers: [
					{ key: 'Access-Control-Allow-Credentials', value: 'true' },
					{
						key: 'Access-Control-Allow-Origin',
						value: `http://${serverIp}`
					},
					{
						key: 'Access-Control-Allow-Methods',
						value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS'
					},
					{
						key: 'Access-Control-Allow-Headers',
						value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
					}
				]
			}
		]
	},
	experimental: {
		serverActions: {
			bodySizeLimit: '20mb'
		}
	},
	// Добавляем конфигурацию Turbopack
	turbopack: {
		// Здесь можно добавить специфические настройки Turbopack при необходимости
	},
	webpack: (config, { isServer, dev }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				net: false,
				tls: false,
				dns: false
			}
		}

		// Обфускация полностью удалена для совместимости с Server Actions

		return config
	}
}

export default withNextIntl(nextConfig)
