import { Middleware, SWRHook } from 'swr'

export const withAuth: Middleware = (useSWRNext: SWRHook) => {
	return (key, fetcher, config) => {
		const swr = useSWRNext(key, fetcher, {
			...config,
			// Add any global config or error handling here
			onError: error => {
				if (error.status === 401) {
					// Handle unauthorized
					window.location.reload()
				}
			}
		})
		return swr
	}
}
