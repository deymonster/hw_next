'use server'

import { revalidatePath } from 'next/cache'

const API_URL = process.env.API_URL || 'http://127.0.0.1:8080/api/admin'
const ADMIN_KEY = process.env.ADMIN_KEY || 'test-admin-key'

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
	const res = await fetch(`${API_URL}${endpoint}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${ADMIN_KEY}`,
			...options.headers
		},
		cache: 'no-store'
	})

	if (!res.ok) {
		throw new Error(`API Error: ${res.status} ${res.statusText}`)
	}

	return res.json()
}

export async function getLicenses() {
	return fetchAPI('/licenses')
}

export async function getTokens() {
	return fetchAPI('/tokens')
}

export async function createLicense(formData: FormData) {
	const inn = formData.get('inn')
	const organization = formData.get('organization')
	const maxSlots = parseInt(formData.get('maxSlots') as string, 10)

	await fetchAPI('/licenses', {
		method: 'POST',
		body: JSON.stringify({ inn, organization, max_slots: maxSlots })
	})

	revalidatePath('/')
}

export async function createToken(formData: FormData) {
	const inn = formData.get('inn')
	const ttl = parseInt(formData.get('ttl') as string, 10)

	await fetchAPI('/tokens', {
		method: 'POST',
		body: JSON.stringify({ inn, ttl_hours: ttl })
	})

	revalidatePath('/')
}

export async function updateLicenseStatus(inn: string, status: string) {
	await fetchAPI(`/licenses/${inn}/status`, {
		method: 'PUT',
		body: JSON.stringify({ status })
	})

	revalidatePath('/')
}

export async function updateLicenseDetails(
	inn: string,
	organization: string,
	maxSlots: number
) {
	// Debug log to ensure inn is not undefined or [object Object]
	console.log(
		`Updating license details for INN: ${inn}, Org: ${organization}, MaxSlots: ${maxSlots}`
	)

	await fetchAPI(`/licenses/${inn}/details`, {
		method: 'PUT',
		body: JSON.stringify({ organization, max_slots: maxSlots })
	})

	revalidatePath('/')
}
