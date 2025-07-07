import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ConfigStore } from './config.type'

import type { TypeBaseColor } from '@/libs/constants/color.constants'

export const configStore = create(
	persist<ConfigStore>(
		set => ({
			theme: 'turquoise',
			setTheme: (theme: TypeBaseColor) => set({ theme })
		}),
		{
			name: 'config',
			storage: createJSONStorage(() => localStorage)
		}
	)
)
