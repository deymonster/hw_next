import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { SidebarStore } from './sidebar.type'

// Безопасная обертка для localStorage, которая работает только на клиенте
const safeStorage = {
  getItem: (name: string) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(name);
    }
    return null;
  },
  setItem: (name: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(name);
    }
  }
};

export const sidebarStore = create(
	persist<SidebarStore>(
		set => ({
			isCollapsed: false,
			setIsCollapsed: (value: boolean) => set({ isCollapsed: value })
		}),
		{
			name: 'sidebar',
			storage: createJSONStorage(() => safeStorage)
		}
	)
)
