import { Check, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '../button'

interface CopyButtonProps {
	value: string | null
}

export function CopyButton({ value }: CopyButtonProps) {
	const t = useTranslations('components.copyButton')
	const [isCopied, setIsCopied] = useState(false)

	function onCopy() {
		if (!value) return

		setIsCopied(true)
		navigator.clipboard.writeText(value)
		toast.success(t('succesMessage'))
		setTimeout(() => {
			setIsCopied(false)
		}, 2000)
	}

	const Icon = isCopied ? Check : Copy

	return (
		<Button
			variant='ghost'
			size='lgIcon'
			onClick={() => onCopy()}
			disabled={!value || isCopied}
		>
			<Icon className='size-5' />
		</Button>
	)
}
