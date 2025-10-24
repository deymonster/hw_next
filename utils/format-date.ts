import { useTranslations } from 'next-intl'
import { useCallback, useMemo } from 'react'

type MonthKey =
	| 'january'
	| 'february'
	| 'march'
	| 'april'
	| 'may'
	| 'june'
	| 'july'
	| 'august'
	| 'september'
	| 'october'
	| 'november'
	| 'december'

type MonthTranslations = Record<MonthKey, string>

const MONTH_KEYS: MonthKey[] = [
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december'
]

/**
 * Formats a date using the provided month translations.
 *
 * @param dateInput - The date that should be formatted.
 * @param includeTime - Indicates whether the returned string should include the time portion.
 * @param translations - A map of month names keyed by {@link MonthKey}.
 *
 * @returns A human readable representation of the provided date.
 */
export function formatDateWithTranslations(
	dateInput: string | Date | number,
	includeTime: boolean,
	translations: MonthTranslations
): string {
	const date = new Date(dateInput)

	if (Number.isNaN(date.getTime())) {
		return ''
	}

	const day = date.getDate()
	const monthIndex = date.getMonth()
	const year = date.getFullYear()

	const hours = date.getHours().toString().padStart(2, '0')
	const minutes = date.getMinutes().toString().padStart(2, '0')

	const monthKey = MONTH_KEYS[monthIndex]
	const monthName = monthKey ? translations[monthKey] : ''

	const formattedDate = `${day} ${monthName} ${year}`.trim()

	if (!includeTime) {
		return formattedDate
	}

	return `${formattedDate}, ${hours}:${minutes}`
}

/**
 * React hook that exposes a localized date formatter backed by `next-intl`.
 *
 * The hook ensures that React hooks rules are respected (the previous implementation
 * invoked `useTranslations` inside a plain function) and memoises translation data
 * so the formatter remains stable between renders.
 */
export function useFormatDate() {
	const t = useTranslations('utils.formatDate.months')

	const translations = useMemo<MonthTranslations>(
		() =>
			MONTH_KEYS.reduce((acc, key) => {
				acc[key] = t(key)
				return acc
			}, {} as MonthTranslations),
		[t]
	)

	return useCallback(
		(dateInput: string | Date | number, includeTime: boolean = false) =>
			formatDateWithTranslations(dateInput, includeTime, translations),
		[translations]
	)
}
