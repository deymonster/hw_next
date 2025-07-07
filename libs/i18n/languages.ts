'use server'

import { cookies } from 'next/headers'

import { COOKIE_NAME, defaultLanguage, type Language } from './config'

export async function getCurrentLanguage() {
	const cookieStore = await cookies()

	const language = cookieStore.get(COOKIE_NAME)?.value ?? defaultLanguage

	return language
}

export async function setLanguage(language: Language) {
	const cookieStore = await cookies()

	return cookieStore.set(COOKIE_NAME, language)
}
