'use client'

import { useState } from 'react'

import { updateLicenseDetails, updateLicenseStatus } from '../actions'

export function LicensesTable({
	licenses
}: {
	licenses: Record<string, any>[]
}) {
	const [editingInn, setEditingInn] = useState<string | null>(null)
	const [editOrg, setEditOrg] = useState('')
	const [editMaxSlots, setEditMaxSlots] = useState(0)

	if (!licenses || licenses.length === 0) {
		return <p className='text-gray-500'>No licenses found.</p>
	}

	const handleStatusChange = async (inn: string, newStatus: string) => {
		if (confirm(`Change status of ${inn} to ${newStatus}?`)) {
			await updateLicenseStatus(inn, newStatus)
		}
	}

	const handleEditClick = (lic: Record<string, any>) => {
		setEditingInn(lic.INN || lic.inn)
		setEditOrg(lic.Organization || lic.organization)
		setEditMaxSlots(lic.MaxSlots || lic.max_slots)
	}

	const handleCancelEdit = () => {
		setEditingInn(null)
	}

	const handleSaveEdit = async () => {
		if (editingInn) {
			await updateLicenseDetails(editingInn, editOrg, editMaxSlots)
			setEditingInn(null)
		}
	}

	return (
		<div className='overflow-x-auto'>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Organization
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							INN
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Slots (Used/Max)
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Status
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Actions
						</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-gray-200 bg-white'>
					{licenses.map((lic, index) => {
						const inn = lic.INN || lic.inn
						const isEditing = editingInn === inn

						return (
							<tr key={lic.ID || inn || `lic-${index}`}>
								<td className='whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900'>
									{isEditing ? (
										<input
											type='text'
											value={editOrg}
											onChange={e =>
												setEditOrg(e.target.value)
											}
											className='rounded border border-gray-300 px-2 py-1'
										/>
									) : (
										lic.Organization || lic.organization
									)}
								</td>
								<td className='whitespace-nowrap px-6 py-4 text-sm text-gray-500'>
									{inn}
								</td>
								<td className='whitespace-nowrap px-6 py-4 text-sm text-gray-500'>
									{isEditing ? (
										<div className='flex items-center gap-1'>
											<span>
												{lic.UsedSlots ||
													lic.used_slots ||
													0}{' '}
												/
											</span>
											<input
												type='number'
												value={editMaxSlots}
												onChange={e =>
													setEditMaxSlots(
														parseInt(
															e.target.value
														) || 0
													)
												}
												className='w-20 rounded border border-gray-300 px-2 py-1'
											/>
										</div>
									) : (
										`${lic.UsedSlots || lic.used_slots || 0} / ${lic.MaxSlots || lic.max_slots}`
									)}
								</td>
								<td className='whitespace-nowrap px-6 py-4 text-sm'>
									<span
										className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
											(lic.Status || lic.status) ===
											'active'
												? 'bg-green-100 text-green-800'
												: (lic.Status || lic.status) ===
													  'revoked'
													? 'bg-red-100 text-red-800'
													: 'bg-yellow-100 text-yellow-800'
										}`}
									>
										{lic.Status || lic.status}
									</span>
								</td>
								<td className='whitespace-nowrap px-6 py-4 text-sm font-medium'>
									{isEditing ? (
										<>
											<button
												onClick={handleSaveEdit}
												className='mr-4 text-blue-600 hover:text-blue-900'
											>
												Save
											</button>
											<button
												onClick={handleCancelEdit}
												className='text-gray-600 hover:text-gray-900'
											>
												Cancel
											</button>
										</>
									) : (
										<>
											<button
												onClick={() =>
													handleEditClick(lic)
												}
												className='mr-4 text-blue-600 hover:text-blue-900'
											>
												Edit
											</button>
											{(lic.Status || lic.status) ===
											'active' ? (
												<button
													onClick={() =>
														handleStatusChange(
															inn,
															'revoked'
														)
													}
													className='text-red-600 hover:text-red-900'
												>
													Revoke
												</button>
											) : (
												<button
													onClick={() =>
														handleStatusChange(
															inn,
															'active'
														)
													}
													className='text-green-600 hover:text-green-900'
												>
													Activate
												</button>
											)}
										</>
									)}
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
