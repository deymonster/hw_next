import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./libs/i18n/request.ts')

const nextConfig: NextConfig = {
	reactStrictMode: true,
	output: 'standalone', // Добавлено для оптимизации Docker-образа
	poweredByHeader: false, // Отключение заголовка X-Powered-By для безопасности
	images: {
		remotePatterns: [
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '8081',
				pathname: '/uploads/**'
			}
		]
	},
	experimental: {
		serverActions: {
			bodySizeLimit: '10mb'
		}
	},
	// Добавляем конфигурацию Turbopack
	turbopack: {
		// Здесь можно добавить специфические настройки Turbopack при необходимости
	},
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				net: false,
				tls: false,
				dns: false
			}
		}

		return config
	}
}

export default withNextIntl(nextConfig)
