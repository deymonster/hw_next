import useSWR from 'swr'

import { useAuth } from './useAuth'

import { withAuth } from '@/libs/swr/middleware'

export function useData<T>(key: string | null) {
	const { isAuthenticated } = useAuth()

	const { data, error, mutate } = useSWR<T>(isAuthenticated ? key : null, {
		revalidateOnFocus: true,
		revalidateIfStale: true,
		use: [withAuth]
	})

	return {
		data,
		loading: !error && !data,
		error,
		mutate
	}
}
