/**
 * Хук `useSidebar` предоставляет доступ к стору боковой панели,
 * позволяя управлять состоянием сворачивания меню из компонентов.
 */
import { sidebarStore } from '@/store/sidebar/sidebar.store'

export function useSidebar() {
	const isCollapsed = sidebarStore(state => state.isCollapsed)
	const setIsCollapsed = sidebarStore(state => state.setIsCollapsed)

	const open = () => setIsCollapsed(false)
	const close = () => setIsCollapsed(true)

	return {
		isCollapsed,
		open,
		close
	}
}
