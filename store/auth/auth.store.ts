import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AuthStore } from './auth.types'

export const authStore = create(
	persist<AuthStore>(
		set => ({
			isAuthenticated: false,
			user: null,
			setIsAuthenticated: (value: boolean) =>
				set({ isAuthenticated: value }),
			setUser: user => set({ user }),
			clear: () => set({ isAuthenticated: false, user: null })
		}),
		{
			name: 'auth',
			storage: createJSONStorage(() => localStorage)
		}
	)
)
