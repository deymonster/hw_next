import { getLicenses, getTokens } from './actions'
import { CreateLicenseModal } from './components/CreateLicenseModal'
import { CreateTokenModal } from './components/CreateTokenModal'
import { LicensesTable } from './components/LicensesTable'
import { TokensTable } from './components/TokensTable'

export default async function Dashboard() {
	const [licenses, tokens] = await Promise.all([getLicenses(), getTokens()])

	return (
		<div className='min-h-screen bg-gray-50 text-gray-900'>
			<header className='bg-white shadow-sm'>
				<div className='mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8'>
					<h1 className='text-2xl font-bold text-gray-900'>
						License Server Admin
					</h1>
				</div>
			</header>

			<main className='mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8'>
				{/* Licenses Section */}
				<section className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<div className='mb-6 flex items-center justify-between'>
						<h2 className='text-xl font-semibold'>Licenses</h2>
						<CreateLicenseModal />
					</div>
					<LicensesTable licenses={licenses} />
				</section>

				{/* Tokens Section */}
				<section className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
					<div className='mb-6 flex items-center justify-between'>
						<h2 className='text-xl font-semibold'>
							Enrollment Tokens
						</h2>
						<CreateTokenModal />
					</div>
					<TokensTable tokens={tokens} />
				</section>
			</main>
		</div>
	)
}
