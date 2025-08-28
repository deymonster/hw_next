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

	// Используем относительный путь, который будет проксироваться через rewrites
	const normalizedPath = path.startsWith('/') ? path.slice(1) : path

	return `/uploads/${normalizedPath}`
}
