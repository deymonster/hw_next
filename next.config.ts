import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// Убираем импорт WebpackObfuscator
// import WebpackObfuscator from 'webpack-obfuscator'

const withNextIntl = createNextIntlPlugin('./libs/i18n/request.ts')

// Получаем IP-адрес сервера из переменной окружения
const serverIp = process.env.NEXT_PUBLIC_SERVER_IP || '192.168.1.1'

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
			}
		]
	},
	// Добавляем rewrites для проксирования запросов к uploads
	async rewrites() {
		return [
			{
				source: '/uploads/:path*',
				destination: 'http://localhost:8081/uploads/:path*'
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
