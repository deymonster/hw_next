'use client'

import { useTranslations } from 'next-intl'
import type { PropsWithChildren } from 'react'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '../alertDialog'

interface ConfirmModalProps {
	heading: string
	message: string
	onConfirm: (e: React.MouseEvent) => void
	onCancel?: (e: React.MouseEvent) => void
	onOpenChange?: (open: boolean) => void
}

export function ConfirmModal({
	children,
	heading,
	message,
	onConfirm,
	onCancel,
	onOpenChange
}: PropsWithChildren<ConfirmModalProps>) {
	const t = useTranslations('components.confirmModal')

	const handleCancel = (e: React.MouseEvent) => {
		// Предотвращаем всплытие события
		e.stopPropagation()
		if (onCancel) onCancel(e)
	}

	// Обработчик изменения состояния открытия модального окна
	const handleOpenChange = (open: boolean) => {
		// Если окно закрывается (open === false)
		if (!open) {
			// Сначала вызываем пользовательский обработчик onOpenChange, если он есть
			if (onOpenChange) {
				onOpenChange(open)
			}

			// Если окно закрывается кликом вне его (а не кнопкой "Отмена"),
			// и есть обработчик onCancel, вызываем его
			if (onCancel) {
				try {
					// Создаем простой объект с методом stopPropagation
					const event = {
						stopPropagation: () => {
							console.log(
								'Stopping propagation for outside click'
							)
						}
					}

					// Вызываем onCancel с этим объектом
					// @ts-expect-error - игнорируем ошибку типа, так как нам нужен только метод stopPropagation
					onCancel(event)
				} catch (error) {
					console.error('Error in onCancel handler:', error)
				}
			}
		}
	}

	return (
		<AlertDialog onOpenChange={handleOpenChange}>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent onClick={e => e.stopPropagation()}>
				<AlertDialogHeader>
					<AlertDialogTitle>{heading}</AlertDialogTitle>
					<AlertDialogDescription>{message}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={handleCancel}>
						{t('cancel')}
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={e => {
							e.stopPropagation()
							onConfirm(e)
						}}
					>
						{t('continue')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
