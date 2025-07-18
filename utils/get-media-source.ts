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

	// Используем относительный путь вместо абсолютного URL
	const baseUrl = '/uploads'

	// Убираем лишний слеш если он есть в начале пути
	const normalizedPath = path.startsWith('/') ? path : `/${path}`

	return `${baseUrl}${normalizedPath}`
}
