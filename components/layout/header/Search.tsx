'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"


export function Search() {
    const t = useTranslations('layout.header.search')
    const [searchTerm, setSearchTerm] = useState('')
    const router = useRouter()

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if(searchTerm.trim()) {
            router.push(`/devices?searchTerm=${searchTerm}`)
        } else {
            router.push('/devices')
        }
    }
    return <div className="ml-auto hidden lg:block">
        <form className="relative flex items-center" onSubmit={onSubmit}>
            <Input 
                placeholder={t('placeholder')}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full pl-4 pr-10 lg:w-[400px]"
            />
            <Button className="absolute right-0.5 h-9" type="submit">
                <SearchIcon className="absolute size-[18px]"/>
            </Button>
        </form>
    </div>
}
