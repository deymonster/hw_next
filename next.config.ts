import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./libs/i18n/request.ts')

// Получаем IP-адрес сервера из переменной окружения
const serverIp = process.env.NEXT_PUBLIC_SERVER_IP || '192.168.1.227'

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
			},
			// Используем переменную окружения для IP-адреса
			{
				protocol: 'http',
				hostname: serverIp,
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
