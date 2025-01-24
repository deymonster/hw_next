import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { SidebarStore } from "./sidebar.type"

export const sidebarStore = create(persist<SidebarStore>(
    (set) => ({
        isCollapsed: false,
        setIsCollapsed: (value: boolean) => set({ isCollapsed: value }),
    }),
    {
        name: "sidebar",
        storage: createJSONStorage(() => localStorage)
    }
))
