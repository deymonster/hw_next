'use client'

import { useState } from 'react'

import { createLicense } from '../actions'

export function CreateLicenseModal() {
	const [isOpen, setIsOpen] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setIsSubmitting(true)
		try {
			await createLicense(new FormData(e.currentTarget))
			setIsOpen(false)
		} catch (err) {
			alert('Failed to create license')
			console.error(err)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<>
			<button
				onClick={() => setIsOpen(true)}
				className='rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
			>
				New License
			</button>

			{isOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
					<div className='w-full max-w-md rounded-lg bg-white p-6'>
						<h3 className='mb-4 text-lg font-medium'>
							Create New License
						</h3>
						<form onSubmit={handleSubmit} className='space-y-4'>
							<div>
								<label className='block text-sm font-medium text-gray-700'>
									Organization
								</label>
								<input
									required
									name='organization'
									type='text'
									className='mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700'>
									INN
								</label>
								<input
									required
									name='inn'
									type='text'
									className='mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								/>
							</div>
							<div>
								<label className='block text-sm font-medium text-gray-700'>
									Max Slots
								</label>
								<input
									required
									name='maxSlots'
									type='number'
									min='1'
									defaultValue='10'
									className='mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
								/>
							</div>

							<div className='mt-6 flex justify-end space-x-3'>
								<button
									type='button'
									onClick={() => setIsOpen(false)}
									className='rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
								>
									Cancel
								</button>
								<button
									type='submit'
									disabled={isSubmitting}
									className='rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50'
								>
									{isSubmitting ? 'Creating...' : 'Create'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	)
}
