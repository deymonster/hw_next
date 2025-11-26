'use client'

import { OnChangeFn, RowSelectionState } from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { createScanDeviceColumns } from './ScanDeviceColumns'

import { DataTable } from '@/components/ui/elements/DataTable'

interface ScanDevice {
	ipAddress: string
	agentKey: string
	isRegistered: boolean
}

interface ScanTableProps {
	data: ScanDevice[]
	_isLoading?: boolean
	onRowSelectionChange?: (selectedRows: string[]) => void
}

export function ScanTable({
	data,
	_isLoading,
	onRowSelectionChange
}: ScanTableProps) {
	const t = useTranslations('dashboard.devices.scanModal')
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

	const columns = useMemo(
		() => createScanDeviceColumns((key: string) => t(key)),
		[t]
	)

	const handleSelectionChange: OnChangeFn<
		RowSelectionState
	> = updaterOrValue => {
		console.log('[SCAN_TABLE] Selection change:', updaterOrValue)

		// Применяем апдейтер к текущему состоянию (если это функция)
		const newSelection =
			typeof updaterOrValue === 'function'
				? updaterOrValue(rowSelection)
				: updaterOrValue

		console.log('[SCAN_TABLE] Current selection:', rowSelection)
		console.log('[SCAN_TABLE] New selection:', newSelection)

		// Обновляем локальное состояние выбора
		setRowSelection(newSelection)

		// Безопасно получаем IP-адреса только для существующих индексов
		const selectedIps = data
			.filter((_, idx) => Boolean(newSelection[String(idx)]))
			.map(item => item.ipAddress)

		console.log('[SCAN_TABLE] All selected IPs:', selectedIps)

		onRowSelectionChange?.(selectedIps)
	}

	return (
		<div>
			<DataTable
				columns={columns}
				data={data}
				pagination={{
					enabled: true,
					pageSize: 5,
					showPageSize: false
				}}
				enableRowSelection={true}
				onRowSelectionChange={handleSelectionChange}
				rowSelection={rowSelection}
				isLoading={_isLoading}
				loadingMessage='Поиск устройств в сети...'
				emptyMessage='Устройства не найдены'
			/>
		</div>
	)
}
