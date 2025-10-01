// import { MEDIA_URL } from "@/libs/constants/url.constants";

// export function getMediaSource(path: string | undefined) {
//     return MEDIA_URL + path
// }

export function getMediaSource(path: string | null): string | undefined {
	if (!path) return undefined

	// Если путь уже содержит полный URL, возвращаем его как есть
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path
	}

	// Если задан базовый URL для хранилища (например, http://localhost:8084),
	// формируем абсолютную ссылку и не зависим от rewrites/порта Next.js
	const base = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL?.trim()
	const normalizedPath = path.startsWith('/') ? path.slice(1) : path

	if (base) {
		const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base
		return `${trimmedBase}/uploads/${normalizedPath}`
	}

	// Иначе используем относительный путь, который будет проксироваться через rewrites
	return `/uploads/${normalizedPath}`
}
