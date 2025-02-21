import { useTranslations } from "next-intl";

export function formatDate(
    dateString: string | Date | number,
    includeTime: boolean = false
) {
    const t = useTranslations('utils.formatDate')

    const date = new Date(dateString)

    const day = date.getDate()
    const monthIndex = date.getMonth()
    const year = date.getFullYear()

    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    const months = [
        t('months.january'), 
        t('months.february'),
        t('months.march'),
        t('months.april'),
        t('months.may'),
        t('months.june'),
        t('months.july'),
        t('months.august'),
        t('months.september'),
        t('months.october'),
        t('months.november'),
        t('months.december')
    ]

    let formattedDate = `${day} ${months[monthIndex]} ${year}`

    if (includeTime) {
        formattedDate += `,  ${hours}:${minutes}`
    }
    return formattedDate
}