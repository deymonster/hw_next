'use client'

export function TokensTable({ tokens }: { tokens: Record<string, any>[] }) {
	if (!tokens || tokens.length === 0) {
		return <p className='text-gray-500'>No tokens found.</p>
	}

	return (
		<div className='overflow-x-auto'>
			<table className='min-w-full divide-y divide-gray-200'>
				<thead className='bg-gray-50'>
					<tr>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Token
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							INN
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Status
						</th>
						<th className='px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500'>
							Expires At
						</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-gray-200 bg-white'>
					{tokens.map((token, index) => {
						const expiresAt = token.ExpiresAt || token.expires_at
						const usedAt = token.UsedAt || token.used_at
						const isExpired = expiresAt
							? new Date(expiresAt) < new Date()
							: false
						const isUsed =
							usedAt !== null &&
							usedAt !== undefined &&
							usedAt !== '0001-01-01T00:00:00Z'

						let status = 'Active'
						if (isUsed) status = 'Used'
						else if (isExpired) status = 'Expired'

						// Fix for hydration mismatch: render dates consistently or avoid client-side locale strings in SSR
						const formattedDate = expiresAt
							? expiresAt.substring(0, 19).replace('T', ' ')
							: 'N/A'

						return (
							<tr key={token.ID || token.token || `tok-${index}`}>
								<td className='whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-500'>
									{token.Token || token.token}
								</td>
								<td className='whitespace-nowrap px-6 py-4 text-sm text-gray-900'>
									{token.INN || token.inn}
								</td>
								<td className='whitespace-nowrap px-6 py-4 text-sm'>
									<span
										className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
											status === 'Active'
												? 'bg-green-100 text-green-800'
												: status === 'Used'
													? 'bg-blue-100 text-blue-800'
													: 'bg-red-100 text-red-800'
										}`}
									>
										{status}
									</span>
								</td>
								<td className='whitespace-nowrap px-6 py-4 text-sm text-gray-500'>
									{formattedDate}
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
