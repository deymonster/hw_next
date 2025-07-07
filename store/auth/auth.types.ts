import { Role } from '@prisma/client'

// Тип пользователя для store
export interface StoreUser {
	id: string
	email: string
	name?: string | null
	image: string | null
	role: Role
}

export interface AuthStore {
	isAuthenticated: boolean
	user: StoreUser | null
	setIsAuthenticated: (value: boolean) => void
	setUser: (user: StoreUser | null) => void
	clear: () => void
}
